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
    host    : 'localhost',
    user    : 'root',
    password: '254425',
    database: 'better_teaching'
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
            roomType: 'meeting',
        });
        return;
    }
    if(rooms[requestRoomId]['room_type'] === 'seminar') {
        response.render('seminar.ejs', {
            roomId: requestRoomId,
            userName: requestUserName,
            roomType: 'seminar',
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

    console.log("meeting roomId:",roomId);
    console.log("meeting userName:",userName);
    roomList[roomId] = {};
    rooms[roomId] = {
        room_name: roomName,
        room_type: 'meeting',
        room_leader: userName
    };
    
    response.render('meeting.ejs', {
        roomId: roomId,
        userName: userName,
        roomType: 'meeting',
    });
});

app.post('/make-seminar', (request, response) => {
    let roomId = request.body.room_id;
    let roomName = request.body.input_rm;
    let userName = request.body.input_nm;
    userName='temp';
    roomName='tempRoom';
    console.log("seminar roomId:",roomId);
    console.log("seminar userName:",roomName);

    roomList[roomId] = {};
    rooms[roomId] = {
        room_name: roomName,
        room_type: 'seminar',
        room_leader: userName
    };
    
    response.render('seminar.ejs', {
        roomId: roomId,
        userName: userName,
        roomType: 'seminar',
    });
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

//--------------------------EVENT Handler----------------------------------------
let ontrackHandler = {
    'meeting': meetingOntrackHandler,
    'seminar': seminarOntrackHandler,
    'share': shareOntrackHandler,
};
//-------------------------------------------------------------------------------

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
            console.log(roomId,',',socketId,',',userName);
            let pc = createReceiverPeerConnection(socket, roomId, userName, ontrackHandler[message.purpose], message.purpose);
            let answer = await createReceiverAnswer(offer, pc);

            receivePCs[message.purpose][socketId] = pc;

            await io.to(socketId).emit("getSenderAnswer", { 
                answer,
                purpose: message.purpose,
            });
        } catch (error) {
            console.error(error);
        }
    });

    //클라이언트 <- 서버 peerConnection offer
    socket.on("receiverOffer", async (message) => {
        try {
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

            if(!sendPCs[purpose][senderSocketId]){
                sendPCs[purpose][senderSocketId] = {};
            }
            sendPCs[purpose][senderSocketId][receiverSocketId] = pc;

            await io.to(receiverSocketId).emit("getReceiverAnswer", {
                id: senderSocketId,
                purpose: purpose,
                answer,
            });
        } catch (error) {
            console.error(error);
        }
    });

    //클라이언트 -> 서버 candidate
    socket.on("senderCandidate", (message) => {
        try {
            let pc = receivePCs[message.purpose][message.senderSocketId];
            if(!message.candidate) return;
            if(!pc) return;
            pc.addIceCandidate(new wrtc.RTCIceCandidate(message.candidate));
        } catch (error) {
            console.error(error);
        }
    });

    //클라이언트 <- 서버 candidate
    socket.on("receiverCandidate", (message) => {
        try {
            if(!message.candidate) return;
            if(!sendPCs[message.purpose][message.senderSocketId]) return;
            if(!sendPCs[message.purpose][message.senderSocketId][message.receiverSocketId]) return;

            let pc = sendPCs[message.purpose][message.senderSocketId][message.receiverSocketId];
            pc.addIceCandidate(new wrtc.RTCIceCandidate(message.candidate));
        } catch (error) {
            console.error(error);
        }
    });

    //방에 처음 접속한 user에게 접속하고 있었던 user들의 정보를 제공하는 역할
    socket.on("joinRoom", async (message) => {
        console.log(message.roomId,',',message.senderSocketId);
        try {
            let rows = [];
            for(var key in roomList[message.roomId]) {
                rows.push({
                    socket_id: key,
                    user_name: users[key]['user_name'],
                });
            }
            if(rows.length !== 0) {
                io.to(message.senderSocketId).emit("allUsers", { 
                    users: rows,
                    purpose: message.purpose,
                });
                
                socket.broadcast.to(message.roomId).emit("seminar_userEnter", { //세미나의 유저수 업데이트
                    purpose: 'seminar',
                });
            }
            socket.join(message.roomId);
            //console.log("joinRoom");
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
            let roomType = rooms[roomId]['room_type'];
            
            if(users[roomId]){
                delete roomToTime[roomId];
            }

            numOfUsers[roomId]--;

            console.log(roomType);

            deleteUser(socketId, roomId);
            closeReceiverPC(socketId, roomType);
            closeSenderPCs(socketId, roomType);

            socket.broadcast.to(roomId).emit("userExit", { 
                id: socketId,
                userName: userName,
                purpose: roomType,
            });
        } catch (error) {
            console.error(error);
        }
    });

    socket.on('roomInfo', (message) => {
        let roomLeader = rooms[message.roomId]['room_leader'];

        io.to(socket.id).emit("isLeader",{isLeader:numOfUsers[message.roomId]})
        if(numOfUsers[message.roomId]===undefined) {
            socket.emit('roomInfo', {
                roomLeader: roomLeader,
                numOfUsers: 1,
                roomType: message.roomType,
            });
            numOfUsers[message.roomId] = 1;
            return;
        }

        console.log(message.roomType);

        socket.emit('roomInfo', {
            roomLeader: roomLeader,
            numOfUsers: ++numOfUsers[message.roomId],
            roomType: message.roomType,
        });
    });

    //1:1 요청
    socket.on('request_1_1', (message) => {
        let target;
        for(var key in users) {
            if(users[key]['user_name'] === message.target) target = key;
        }
        console.log(message.userName);
        io.to(target).emit('get_1_1_request', {userName: message.userName});
    });

    //화면 공유
    socket.on('display_share', (message) => {

    });

    socket.on('set_roomTime', function(data) {
        if(roomToTime[data.roomId]===undefined)
            roomToTime[data.roomId]=data.time;
        else
            socket.emit('get_roomTime',{time:roomToTime[data.roomId]});
        //console.log("roomToTime:",roomToTime[data.roomId]);
    });

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

    socket.on("show",function (data){
        console.log("===================")
        console.log("sendPcs:",sendPCs['seminar'])
        //console.log("receivePCs:",receivePCs['seminar'])
        console.log("roomList",roomList);
        console.log("users",users)
    })
});

function createSenderPeerConnection(receiverSocketId, senderSocketId, stream, purpose) {
    let pc = new wrtc.RTCPeerConnection(pc_config);
    
    pc.onicecandidate = (e) => {
        if(e.candidate) {
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
        userName: userName,
        purpose: 'meeting',
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
    return;
}

function seminarOntrackHandler(stream, socket, roomId, userName) {
    if(ontrackSwitch) {
        ontrackSwitch = false;
        return;
    }
    userStreams[socket.id] = stream;
    /*socket.broadcast.to(roomId).emit("userEnter", { 
        socketId: socket.id,
        roomId: roomId,
        userName: userName,
        purpose: 'seminar',
    });
    */
    
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
    return;
}

function shareOntrackHandler(stream, socket, roomId, userName) {

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
