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
    password: 'Uxis100!',
    database: 'better_teaching'
});

connection.on('error', (err) => {
	console.error(err);
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

app.get('/', (request, response) => {
    response.render('login.ejs');
});

app.post('/login', (request, response) => {
    var requestRoomId = request.body.input_rm;
    var requestUserName = request.body.input_nm;
    
    connection.query(`select room_type from rooms where room_id = '${requestRoomId}';`, (err, results, fields) => {
        if(err) {
            console.error(err);
            return;
        }
        if(results.length === 0) {
            response.redirect('/');
            return;
        }
        if(results[0].room_type === 1) {
        	connection.query(`select count(*) as c from ${requestRoomId}`, (err, rows, fields) => {
                response.render('meeting.ejs', {
                    roomId: requestRoomId,
                    userName: requestUserName,
                    numUsers: rows[0].c
                });
                return;
            });
		}
        if(results[0].room_type === 2) {
            response.render('seminar.ejs', {
                roomId: requestRoomId,
                userName: requestUserName
            });
            return;
        }
    });
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

    connection.query("create table " + roomId + "(socket_id char(25) primary key);");
    connection.query("insert into rooms(room_id, room_name, room_type) value('" + roomId + "', '" + roomName + "', '" + 1 + "');");
    
    response.render('meeting.ejs', {
        roomId: roomId,
        userName: userName
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

let sendPCs = {};
let receivePCs = {};
let userStreams = {};

let ontrackSwitch = false;

io.on('connection', function(socket) {
    console.log("connection");
    
    //클라이언트 -> 서버 peerConnection offer
    socket.on("senderOffer", async (message) => {
        try {
            var revSdp = message.sdp;
            var socketId = message.senderSocketId;
            var roomId = message.roomId;
            var userName = message.userName;

            connection.query(`insert into ${roomId}(socket_id) values('${socketId}');`);
            connection.query(`insert into users(socket_id, user_name, room_id) values('${socketId}', '${userName}', '${roomId}');`);
            
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
            connection.query(`select * from users,${message.roomId} where users.socket_id = ${message.roomId}.socket_id;`, (err, rows, fields) => {
                if(err) {
                    console.error(err);
                    return;
                }
                io.to(message.senderSocketId).emit("allUsers", { 
                    users: rows,
                });
                console.log("joinRoom"); 
            });
        } catch (error) {
            console.error(error);
        }
    });

    //통신 종료
    socket.on("disconnect", () => {
        try {
            connection.query(`select * from users where socket_id = '${socket.id}'`, (err, rows, fields) => {
                if(err) {
                    console.error(err);
                    return;
                }

                let roomId = rows[0].room_id;
                let socketId = rows[0].socket_id;
                let userName = rows[0].user_name;

                deleteUser(socketId, roomId);
                closeReceiverPC(socketId);
                closeSenderPCs(socketId);

                socket.broadcast.to(roomId).emit("userExit", { 
                    id: socketId,
                    userName: userName
                });
            });
        } catch (error) {
            console.error(error);
        }
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
        
        ontrackSwitch = true;
    }

    return pc;
}

//DB에서 나간 유저의 정보 삭제
//마지막 유저가 나가면 방이 삭제됨
function deleteUser(socketId, roomId) {
    connection.query("delete from " + roomId + " where socket_id = '" + socketId + "';");
    connection.query("delete from users where socket_id = '" + socketId + "';");
    connection.query("select * from " + roomId + ";", (err, results, fields) => {
        if(err) {
            console.error(err);
            return;
        }
        if(results.length === 0) {
            connection.query("drop table " + roomId + ";");
            connection.query(`delete from rooms where room_id = '${roomId}'`);
            return;
        }
    });
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
