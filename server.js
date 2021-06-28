const express = require('express');
const app = express();
const https = require('https');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const wrtc = require('wrtc');
const fs = require('fs');

const connection = mysql.createConnection({
    host    : 'localhost',
    user    : 'root',
    password: '254425',
    database: 'better_teaching'
});

connection.connect();

app.set('view engine', 'ejs');
app.use(express.static(__dirname));
app.use(bodyParser.urlencoded({extended: false}));

const options = {
    key: fs.readFileSync('./key/privkey.pem'),
    cert: fs.readFileSync('./key/cert.crt')
};

const server = https.createServer(options, app).listen(443, () => {
    console.log("Create HTTPS Server");
});

//-------------------------------------RUN TIME DATA-----------------------------------
let roomList = {};
let users = {};
let rooms = {};

let sendPCs = {
    'seminar':{},
    'meeting':{},
    'share':{}
};
let receivePCs = {
    'seminar':{},
    'meeting':{},
    'share':{}
};

let userStreams = {};
let shareStreams = {};
let seminarStreams = {};
let numOfUsers = {};

let ontrackSwitch = false;
let candidateSwitch;
//-------------------------------------------------------------------------------------

app.get('/', (request, response) => {
    response.render('login.ejs');
});

app.post('/login', (request, response) => {
    var requestRoomId = request.body.input_rm;
    var requestUserName = request.body.input_nm;
    
    if(!roomList[requestRoomId]) {
        response.redirect('/');
        return;
    }
    if(rooms[requestRoomId]['room_type'] === 'meeting') {
        response.render('meeting.ejs', {
            roomId: requestRoomId,
            userName: requestUserName,
        });
        return;
    }
    if(rooms[requestRoomId]['room_type'] === 'seminar') {
        response.render('seminar.ejs', {
            roomId: requestRoomId,
            userName: requestUserName
        });
        return;
    }
});

app.get('/make-room', (request, response) => {
    response.render('select.ejs');
});

app.get('/make-meeting', (request, response) => {
    response.render('select_new_meeting');
});

app.get('/make-seminar', (request, response) => {
    response.render('select_new_seminar');
});

app.post('/make-meeting', (request, response) => {
    let roomId = request.body.room_id;
    let roomName = request.body.input_rm;
    let userName = request.body.input_nm;

    console.log(roomId);
    console.log(rooms);

    roomList[roomId] = {};
    rooms[roomId] = {
        room_name: roomName,
        room_type: 'meeting',
        room_leader: userName
    };

    response.render('meeting.ejs', {
        roomId: roomId,
        userName: userName,
    });
});

app.post('/make-seminar', (request, response) => {
    let roomId = request.body.input_rm;
    let userName = request.body.input_nm;

    connection.query("create table " + roomId + "(socket_id char(25) primary key);");
});

app.get('/meeting', (request, response) => {
    response.render('meeting.ejs', {
        roomId: requestRoomId,
        userName: requestUserName
    });
});

app.get('/seminar', (request, response) => {
    response.render('meeting_seminar.ejs', {
        roomId: requestRoomId,
        userName: requestUserName
    });
});

app.get('/exit', (request, response) => {
    response.redirect('/');
});

//-----------------------------------------------------------------------

const io = require('socket.io')(server);

const pc_config = {
    iceServers: [
        // {
        //   urls: 'stun:[STUN_IP]:[PORT]',
        //   'credentials': '[YOR CREDENTIALS]',
        //   'username': '[USERNAME]'
        // },
        {
            urls: "stun:edu.uxis.co.kr"
        },
        {
            urls: "turn:edu.uxis.co.kr?transport=tcp",
                    "username": "webrtc",
                    "credential": "webrtc100!"
        }
    ],
}

io.on('connection', function(socket) {
    console.log("connection");
    
    //클라이언트 -> 서버 peerConnection offer
    socket.on("senderOffer", async (message) => {
        try {
            var offer = message.offer;
            var socketId = message.senderSocketId;
            var roomId = message.roomId;
            var userName = message.userName;

            roomList[roomId][socketId] = 1;
            users[socketId] = {
                user_name: userName,
                room_id: roomId
            };

            candidateSwitch = false;

            let pc = createReceiverPeerConnection(socket, roomId, userName, meetingOntrackHandler, message.purpose);
            let answer = await createReceiverAnswer(offer, pc);

            receivePCs[message.purpose][socketId] = pc;

            await io.to(socketId).emit("getSenderAnswer", { answer });

            candidateSwitch = true;
        } catch (error) {
            console.error(error);
        }
    });

    //클라이언트 <- 서버 peerConnection offer
    socket.on("receiverOffer", async (message) => {
        try {
            candidateSwitch = false;

            let offer = message.offer;
            let purpose = message.purpose;
            let senderSocketId = message.senderSocketId;
            let receiverSocketId = message.receiverSocketId;

            let pc = createSenderPeerConnection(
                receiverSocketId,
                senderSocketId,
                userStreams[senderSocketId],
                purpose,
            );
            let answer = await createSenderAnswer(offer, pc);

            if(sendPCs[purpose][senderSocketId]) {
                sendPCs[purpose][senderSocketId][receiverSocketId] = pc;
            } else {
                sendPCs[purpose][senderSocketId] = {};
                sendPCs[purpose][senderSocketId][receiverSocketId] = pc;
            }

            await io.to(receiverSocketId).emit("getReceiverAnswer", {
                id: senderSocketId,
                purpose: purpose,
                answer,
            });

            candidateSwitch = true;
        } catch (error) {
            console.error(error);
        }
    });

    //클라이언트 -> 서버 candidate
    socket.on("senderCandidate", (message) => {
        try {
            let pc = receivePCs[message.purpose][message.senderSocketId];
            pc.addIceCandidate(new wrtc.RTCIceCandidate(message.candidate));
        } catch (error) {
            console.error(error);
        }
    });

    //클라이언트 <- 서버 candidate
    socket.on("receiverCandidate", async (message) => {
        try {
            let senderPC = sendPCs[message.purpose][message.senderSocketId][message.receiverSocketId];
            await senderPC.addIceCandidate(new wrtc.RTCIceCandidate(message.candidate));
        } catch (error) {
            console.error(error);
        }
    });

    //방에 처음 접속한 user에게 접속하고 있었던 user들의 정보를 제공하는 역할
    socket.on("joinRoom", async (message) => {
        try {
            let rows = [];
            for(var key in roomList[message.roomId]) {
                rows.push({
                    socket_id: key,
                    user_name: users[key]['user_name'],
                });
            }
            if(!rows.length === 0) {
                io.to(message.senderSocketId).emit("allUsers", { 
                    users: rows,
                });
            }
            socket.join(message.roomId);
            console.log("joinRoom");
        } catch (error) {
            console.error(error);
        }
    });

    //통신 종료
    socket.on("disconnect", (message) => {
        try {
            let roomId = users[socket.id]['room_id'];
            let socketId = socket.id;
            let userName = users[socket.id]['user_name'];

            numOfUsers[roomId]--;

            deleteUser(socketId, roomId);
            closeReceiverPC(socketId, message.purpose);
            closeSenderPCs(socketId, message.purpose);

            socket.broadcast.to(roomId).emit("userExit", { 
                id: socketId,
                userName: userName,
                numOfUsers: numOfUsers[roomId],
                roomId: roomId,
                purpose: message.purpose,
            });
        } catch (error) {
            console.error(error);
        }
    });

    socket.on('roomInfo', (message) => {
        let roomLeader = rooms[message.roomId]['room_leader'];

        if(roomLeader === message.userName) {
            socket.emit('roomInfo', {
                roomLeader: roomLeader,
                numOfUsers: 1
            });
            numOfUsers[message.roomId] = 1;
            return;
        }

        socket.emit('roomInfo', {
            roomLeader: roomLeader,
            numOfUsers: ++numOfUsers[message.roomId],
            roomType: rooms[message.roomId]['room_type'],
        });
    });

    //1:1 요청
    socket.on('request_1_1', (message) => {
        let target;
        for(var key in users) {
            if(users[key]['user_name'] === message.target) target = key;
        }
        io.to(target).emit('get_1_1_request');
    });

    //화면 공유
    socket.on('display_share', (message) => {

    });
});

function createSenderPeerConnection(receiverSocketId, senderSocketId, stream, purpose) {
    let pc = new wrtc.RTCPeerConnection(pc_config);

    pc.onicecandidate = (e) => {
        if(!candidateSwitch) return;
        if(!e.candidate) {
            io.to(receiverSocketId).emit("getReceiverCandidate", {
                id: senderSocketId,
                candidate: e.candidate,
                purpose: purpose,
            });
        }
    }

    pc.oniceconnectionstatechange = (e) => {
        //console.log(e);
    }

    stream.getTracks().forEach((track => {
        pc.addTrack(track, stream);
    }));

    return pc;
}

function createReceiverPeerConnection(socket, roomId, userName, ontrackHandler, purpose) {
    let pc = new wrtc.RTCPeerConnection(pc_config);
    
    pc.onicecandidate = (e) => {
        if(!candidateSwitch) return;
        if(!e.candidate) return;
        io.to(socket.id).emit("getSenderCandidate", {
            candidate: e.candidate,
            purpose: purpose,
        });
    }

    pc.oniceconnectionstatechange = (e) => {
        //console.log(e);
    }

    pc.ontrack = (e) => {
        ontrackHandler(e.streams[0], socket, roomId, userName);
    }

    return pc;
}

async function createSenderAnswer(offer, pc) {
    try {
        await pc.setRemoteDescription(offer);
        let answer = await pc.createAnswer({
            offerToReceiveAudio: false,
            offerToReceiveVideo: false,
        });
        await pc.setLocalDescription(answer);

        return answer;
    } catch(err) {
        console.error(err);
    }
}

async function createReceiverAnswer(offer, pc) {
    try {
        await pc.setRemoteDescription(offer);
        let answer = await pc.createAnswer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(answer);

        return answer;
    } catch(err) {
        console.error(err);
    }
}

function meetingOntrackHandler(stream, socket, roomId, userName) {
    if(ontrackSwitch) {
        ontrackSwitch = false;
        return;
    }
    userStreams[socket.id] = stream;

    socket.broadcast.to(roomId).emit("userEnter", { 
        socketId: socket.id,
        roomId: roomId,
        userName: userName
    });
    
    ontrackSwitch = true;
    return;
}

//DB에서 나간 유저의 정보 삭제
//마지막 유저가 나가면 방이 삭제됨
function deleteUser(socketId, roomId) {
    delete roomList[roomId][socketId];
    delete users[socketId];

    if(Object.keys(roomList[roomId]).length === 0) {
        delete roomList[roomId];
        delete rooms[roomId];
        return;
    }
}

//받는 peerConnection 종료
function closeReceiverPC(socketId, purpose) {
    if (!receivePCs[purpose][socketId]) return;

    receivePCs[purpose][socketId].close();
    delete receivePCs[purpose][socketId];
}

//보내는 peerConnection 종료
function closeSenderPCs(socketId, purpose) {
    if(!sendPCs[purpose][socketId]) return;

    for(var key in sendPCs[purpose][socketId]) {
        sendPCs[purpose][socketId][key].close();
        delete sendPCs[purpose][socketId][key];
    }

    delete sendPCs[purpose][socketId];
}