const express = require('express');
const app = express();
const https = require('https');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const wrtc = require('wrtc');
const fs = require('fs');
/*
const connection = mysql.createConnection({
    host     : '104.198.45.164',
    user     : 'root',
    password : '1111',
    database : 'webrtc',
});

connection.connect();
*/

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
let roomToTime={};

let sendPCs = {};
let receivePCs = {};
let userStreams = {};
let numOfUsers = {};

let ontrackSwitch = false;
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
    if(rooms[requestRoomId]['room_type'] === 1) {
        response.render('meeting.ejs', {
            roomId: requestRoomId,
            userName: requestUserName,
        });
        return;
    }
    if(rooms[requestRoomId]['room_type'] === 2) {
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
        room_type: 1,
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
            var revSdp = message.sdp;
            var socketId = message.senderSocketId;
            var roomId = message.roomId;
            var userName = message.userName;

            roomList[roomId][socketId] = 1;
            users[socketId] = {
                user_name: userName,
                room_id: roomId
            };

            let pc = createReceiverPeerConnection(socketId, socket, roomId, userName);
            await pc.setRemoteDescription(revSdp);
            let sdp = await pc.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            });
            await pc.setLocalDescription(sdp);

            socket.join(roomId);
            io.to(message.senderSocketId).emit("getSenderAnswer", { sdp });
        } catch (error) {
            console.error(error);
        }
    });

    //클라이언트 <- 서버 peerConnection offer
    socket.on("receiverOffer", async (message) => {
        try {
            let pc = createSenderPeerConnection(
                message.receiverSocketId,
                message.senderSocketId,
            );
            await pc.setRemoteDescription(message.sdp);
            let sdp = await pc.createAnswer({
                offerToReceiveAudio: false,
                offerToReceiveVideo: false,
            });
            await pc.setLocalDescription(sdp);
            io.to(message.receiverSocketId).emit("getReceiverAnswer", {
                id: message.senderSocketId,
                sdp,
            });
        } catch (error) {
            console.error(error);
        }
    });

    //클라이언트 -> 서버 candidate
    socket.on("senderCandidate", (message) => {
        try {
            let pc = receivePCs[message.senderSocketId];
            pc.addIceCandidate(new wrtc.RTCIceCandidate(message.candidate));
        } catch (error) {
            console.error(error);
        }
    });

    //클라이언트 <- 서버 candidate
    socket.on("receiverCandidate", async (message) => {
        try {
            let senderPC = sendPCs[message.senderSocketId][message.receiverSocketId];
            await senderPC.addIceCandidate(new wrtc.RTCIceCandidate(message.candidate));
        } catch (error) {
            console.log("여긴가?" + error);
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
                    room_id: users[key]['room_id']
                });
            }
            io.to(message.senderSocketId).emit("allUsers", { 
                users: rows,
            });
            console.log("joinRoom");
        } catch (error) {
            console.error(error);
        }
    });

    //통신 종료
    socket.on("disconnect", () => {
        try {
            let roomId = users[socket.id]['room_id'];
            let socketId = socket.id;
            let userName = users[socket.id]['user_name'];
            
            if(users[roomId]===undefined){
                delete roomToTime[roomId];
            }

            numOfUsers[roomId]--;

            deleteUser(socketId, roomId);
            closeReceiverPC(socketId);
            closeSenderPCs(socketId);

            socket.broadcast.to(roomId).emit("userExit", { 
                id: socketId,
                userName: userName,
                numOfUsers: numOfUsers[roomId],
                roomId: roomId
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
            numOfUsers: ++numOfUsers[message.roomId]
        });
    });

    socket.on('request_1_1', (message) => {
        let target;
        for(var key in users) {
            if(users[key]['user_name'] === message.target) target = key;
        }
        io.to(target).emit('get_1_1_request');
    });

    socket.on('set_roomTime', function(data) {
        console.log("roomToTime:",roomToTime[data.roomId]);
        if(roomToTime[data.roomId]===undefined)
            roomToTime[data.roomId]=data.time;
        else
            socket.emit('get_roomTime',{time:roomToTime[data.roomId]});
    })  

    socket.on('message', (data) => {
        console.log("chat_"+data.userName,":",data.message)
        /* 보낸 사람을 제외한 나머지 유저에게 메시지 전송 */
        socket.broadcast.to(data.roomId).emit('update', data);
        /*
        //mysql에 대화 정보 저장
        var sql = "INSERT INTO chat_db (userName, roomId, roomTime, msg) VALUES ('"+ data.userName +"','"+ data.roomId+"','"+data.roomTime+"','"+data.message+"')";
        connection.query(sql, function (err, result) {
        if (err) throw err;
        console.log("1 record inserted");
        });
        */
    });
});

function createSenderPeerConnection(receiverSocketId, senderSocketId) {
    let pc = new wrtc.RTCPeerConnection(pc_config);

    if(sendPCs[senderSocketId]) {
        sendPCs[senderSocketId][receiverSocketId] = pc;
    } else {
        sendPCs[senderSocketId] = {};
        sendPCs[senderSocketId][receiverSocketId] = pc;
    }

    pc.onicecandidate = (e) => {
        io.to(receiverSocketId).emit("getReceiverCandidate", {
            id: senderSocketId,
            candidate: e.candidate,
        });
    }

    pc.oniceconnectionstatechange = (e) => {
        //console.log(e);
    }

    const stream = userStreams[senderSocketId];
    stream.getTracks().forEach((track => {
        pc.addTrack(track, stream);
    }));

    return pc;
}

function createReceiverPeerConnection(socketId, socket, roomId, userName) {
    let pc = new wrtc.RTCPeerConnection(pc_config);

    receivePCs[socketId] = pc;
    
    pc.onicecandidate = (e) => {
        io.to(socketId).emit("getSenderCandidate", {
            candidate: e.candidate,
        });
    }

    pc.oniceconnectionstatechange = (e) => {
        //console.log(e);
    }

    pc.ontrack = (e) => {
        if(ontrackSwitch) {
            ontrackSwitch = false;
            return;
        }
        userStreams[socketId] = e.streams[0];

        socket.broadcast.to(roomId).emit("userEnter", { 
            socketId: socketId,
            roomId: roomId,
            userName: userName
        });
        //이전 채팅 보내기 
        /*
        connection.query("SELECT * FROM chat_db where roomId = '"+roomId+"' and roomTime ="+roomToTime[roomId], function (err, result, fields) {
            if (err) throw err;
            //console.log(result);
            console.log('request_chat');
            socket.emit('get_chat',result)
        });	
        */
        ontrackSwitch = true;
    }

    return pc;
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
function closeReceiverPC(socketId) {
    if (!receivePCs[socketId]) return;

    receivePCs[socketId].close();
    delete receivePCs[socketId];
}

//보내는 peerConnection 종료
function closeSenderPCs(socketId) {
    if(!sendPCs[socketId]) return;

    for(var key in sendPCs[socketId]) {
        sendPCs[socketId][key].close();
        delete sendPCs[socketId][key];
    }

    delete sendPCs[socketId];
}