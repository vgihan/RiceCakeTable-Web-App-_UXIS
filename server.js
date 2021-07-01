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

let userStreams = {
    'seminar':{},
    'meeting':{},
    'share':{},
};
let numOfUsers = {};

let shareSwitch = {};
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

    roomList[roomId] = {};
    rooms[roomId] = {
        room_name: roomName,
        room_type: 'meeting',
        room_leader: undefined,
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
    
    console.log("seminar roomId:",roomId);
    console.log("seminar userName:",roomName);

    roomList[roomId] = {};
    rooms[roomId] = {
        room_name: roomName,
        room_type: 'seminar',
        room_leader: undefined,
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

let joinRoomHandler = {
    'meeting': meetingJoinRoomHandler,
    'seminar': seminarJoinRoomHandler,
}
//-------------------------------------------------------------------------------

io.on('connection', function(socket) {
    console.log("connection");
    
    //클라이언트 -> 서버 peerConnection offer
    socket.on("sender_offer", async (message) => {
        try {
            var offer = message.offer;
            var socketId = message.senderSocketId;
            var roomId = message.roomId;
            var userName = message.userName;
            
            let pc = createReceiverPeerConnection(socket, roomId, userName, ontrackHandler[message.purpose], message.purpose);
            let answer = await createReceiverAnswer(offer, pc);

            receivePCs[message.purpose][socketId] = pc;

            await io.to(socketId).emit("get_sender_answer", { 
                answer,
                purpose: message.purpose,
            });
        } catch (error) {
            console.error(error);
        }
    });

    //클라이언트 <- 서버 peerConnection offer
    socket.on("receiver_offer", async (message) => {
        try {
            let offer = message.offer;
            let purpose = message.purpose;
            let senderSocketId = message.senderSocketId;
            let receiverSocketId = message.receiverSocketId;

            //console.log(userStreams['share'][senderSocketId].getVideoTracks().length);

            let pc = createSenderPeerConnection(
                receiverSocketId,
                senderSocketId,
                userStreams[purpose][senderSocketId],
                purpose,
            );
            let answer = await createSenderAnswer(offer, pc);

            if(!sendPCs[purpose][senderSocketId]){
                sendPCs[purpose][senderSocketId] = {};
            }
            sendPCs[purpose][senderSocketId][receiverSocketId] = pc;

            await io.to(receiverSocketId).emit("get_receiver_answer", {
                id: senderSocketId,
                purpose: purpose,
                answer,
            });
        } catch (error) {
            console.error(error);
        }
    });

    //클라이언트 -> 서버 candidate
    socket.on("sender_candidate", (message) => {
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
    socket.on("receiver_candidate", (message) => {
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
    socket.on("join_room", async (message) => {
        joinRoomHandler[message.purpose](message, socket);
    });

    //통신 종료
    socket.on("meeting_disconnect", () => {
        try {
            console.log('meeting disconnect');

            let roomId = users[socket.id]['room_id'];
            let socketId = socket.id;
            let userName = users[socket.id]['user_name'];
            let roomType = rooms[roomId]['room_type'];
            let roomLeader = rooms[roomId]['room_leader'];

            if(users[roomId]){
                delete roomToTime[roomId];
            }

            numOfUsers[roomId]--;

            deleteUser(socketId, roomId);
            closeReceiverPC(socketId, roomType);
            closeSenderPCs(socketId, roomType);

            socket.broadcast.to(roomId).emit("user_exit", { 
                id: socketId,
                userName: userName,
                purpose: roomType,
            });

            if(roomLeader !== socket.id) closeSenderPCs(socket.id, 'meeting');
            else {
                for(var key in roomList[roomId]) {
                    closeReceiverPC(key, 'meeting');
                }
                delete userStreams['meeting'][socket.id];
                delete rooms[roomId];
                delete roomList[roomId];
            }
        } catch (error) {
            console.error(error);
        }
    });

    socket.on('seminar_disconnect', () => {
        try {
            console.log('seminar disconnect');

            var roomId = users[socket.id]['room_id'];
            var roomLeader = rooms[roomId]['room_leader'];
            
            deleteUser(socket.id, roomId);
            
            socket.broadcast.to(roomId).emit("user_exit", { 
                socketId: socket.id,
            });

            numOfUsers[roomId]--;

            if(roomLeader !== socket.id) closeSenderPCs(socket.id, 'seminar');
            else {
                for(var key in roomList[roomId]) {
                    closeReceiverPC(key, 'seminar');
                }
                delete userStreams['seminar'][socket.id];
                delete rooms[roomId];
                delete roomList[roomId];
            }
        } catch(err) {
            console.error(err);
        }
    });

    socket.on('share_disconnect', () => {
        console.log('share disconnect');

        if(!shareSwitch[users[socket.id]['room_id']]) return;

        receivePCs['share'][socket.id].close();
        delete receivePCs['share'][socket.id];

        for(var key in roomList[users[socket.id]['room_id']]) {
            if(!sendPCs['share'][key]) continue;

            sendPCs['share'][key].close();
            delete sendPCs['share'][key];

            if(!userStreams['share'][key]) continue;

            delete userStreams['share'][key];
        }

        socket.broadcast.to(users[socket.id]['room_id']).emit('share_disconnect');

        delete shareSwitch[users[socket.id]['room_id']];
    });

    socket.on('room_info', (message) => {
        if(!rooms[message.roomId]['room_leader']) {
            rooms[message.roomId]['room_leader'] = socket.id;
        }
        let roomLeader = rooms[message.roomId]['room_leader'];

        if(!numOfUsers[message.roomId]) {
            socket.emit('room_info', {
                roomLeader: roomLeader,
                numOfUsers: 1,
                roomType: message.roomType,
                userName: message.userName,
                leaderName: message.userName,
            });
            numOfUsers[message.roomId] = 1;
            return;
        }

        socket.emit('room_info', {
            roomLeader: roomLeader,
            numOfUsers: ++numOfUsers[message.roomId],
            roomType: message.roomType,
            userName: message.userName,
            leaderName: users[roomLeader]['user_name'],
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

    socket.on('set_room_time', function(data) {
        if(roomToTime[data.roomId]===undefined)
            roomToTime[data.roomId]=data.time;
        else
            socket.emit('get_room_time',{time:roomToTime[data.roomId]});
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
    });

    socket.on("leader_socket_id_request", (message) => {
        io.to(socket.id).emit("leader_socket_id_response", {
            leaderSocketId: rooms[message.roomId]['room_leader'],
        });
    });

    socket.on("share_question", () => {
        if(shareSwitch[users[socket.id]['room_id']]) return;

        io.to(socket.id).emit("share_possible");
        shareSwitch[users[socket.id]['room_id']] = true;
    });
});

function createSenderPeerConnection(receiverSocketId, senderSocketId, stream, purpose) {
    let pc = new wrtc.RTCPeerConnection(pc_config);
    
    pc.onicecandidate = (e) => {
        if(e.candidate) {
            io.to(receiverSocketId).emit("get_receiver_candidate", {
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
        io.to(socket.id).emit("get_sender_candidate", {
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
    userStreams['meeting'][socket.id] = stream;

    socket.broadcast.to(roomId).emit("user_enter", { 
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
    userStreams['seminar'][socket.id] = stream;

    socket.broadcast.to(roomId).emit("user_enter", { 
        socketId: socket.id,
        roomId: roomId,
        userName: userName,
        purpose: 'seminar',
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

function shareOntrackHandler(stream, socket, roomId, userName) {
    if(ontrackSwitch) {
        ontrackSwitch = false;
        return;
    }
    socket.broadcast.to(roomId).emit('share_request', {
        userName: userName,
        socketId: socket.id,
    });
    userStreams['share'][socket.id] = stream;

    ontrackSwitch = true;
}

function meetingJoinRoomHandler(message, socket) {
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
            io.to(message.senderSocketId).emit("all_users", { 
                users: rows,
            });
        }
        socket.join(message.roomId);
        roomList[message.roomId][message.senderSocketId] = 1;
        users[message.senderSocketId] = {
            user_name: message.userName,
            room_id: message.roomId,
        };
    } catch (error) {
        console.error(error);
    }
}

function seminarJoinRoomHandler(message, socket) {
    try {
        let rows = [];
        for(var key in roomList[message.roomId]) {
            rows.push({
                socket_id: key,
                user_name: users[key]['user_name'],
            });
        }
        if(rows.length !== 0) {
            io.to(message.senderSocketId).emit("all_users", { 
                users: rows,
            });
            socket.broadcast.to(message.roomId).emit("user_enter", { 
                userName: message.userName,
                socketId: message.senderSocketId,
            });
        }
        socket.join(message.roomId);
        roomList[message.roomId][message.senderSocketId] = 1;
        users[message.senderSocketId] = {
            user_name: message.userName,
            room_id: message.roomId,
        };
    } catch (error) {
        console.error(error);
    }
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
