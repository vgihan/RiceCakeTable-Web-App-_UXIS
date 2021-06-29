
const express = require('express');
const app = express();
const fs = require('fs');
const https = require('https');
const wrtc = require('wrtc');

// HTTP Server 생성
const options = {
    key: fs.readFileSync('./keys/private.key'),
    cert: fs.readFileSync('./keys/cert.crt')
};

const server = https.createServer(options, app).listen(441, () => {
    console.log("Create HTTPS Server");
});

app.get('/', (request, response) => {
    fs.readFile('11.html', (err, data) => {
        if(err) {
            console.log(err);
            response.end();
        } else {
            response.end(data);
        }
    });
});

app.get('/favicon.ico', function(req, res) { 
    res.sendStatus(204); 
});

app.use(express.static(__dirname));

// SOCKET
const io = require('socket.io')(server);

let user11={}
//let receivePC11 = {}
//let sendPC11 = {}
//let stream11 = {}

let n=0

const pc_config = {
    iceServers: [
        // {
        //   urls: 'stun:[STUN_IP]:[PORT]',
        //   'credentials': '[YOR CREDENTIALS]',
        //   'username': '[USERNAME]'
        // },
    ],
}

// Client가 Socket에 접속 
io.on('connection', function(socket) {

    console.log("connection : " + socket.id);
    n = n+1;
    user11[n] = [{id : socket.id}]

    // Client 2명이면 1:1 대화 시작
    //(수락 버튼 눌렀을때 conneciton 되게 하면...?)
    if(n==2) socket.emit("request_1_1");
    if(n>2) socket.emit("full")
   
    socket.on('offer11', message => {
        console.log("offer from : " + message.id);
        console.log(message.sdp);
        socket.broadcast.emit('getOffer11',{sdp : message.sdp});
    });

    socket.on('answer11', message => {
        console.log("answer from : " + message.id);
        console.log(message.sdp);
        socket.broadcast.emit('getAnswer11',{sdp : message.sdp});
    });

    socket.on('candidate11', message => {
        console.log("candidate from : " + message.id);
        socket.broadcast.emit('getCandidate11',{candidate : message.candidate});
    });

    socket.on("disconnect", () => {
        console.log("disconnection");
        n = n-1;
        user11 = {};
        if(n == 1) socket.broadcast.emit("end");
    });
});

    

//     // Sender가 요청한 Offer
//     socket.on("SOffer", async (message) => {
//         try {
//             // 받는 PC 생성
//             let pc = ReceivePC(message.socketId, socket); // Offer 보낸 소켓ID, 자기 소켓
//             // Remote에 Offer SDP 저장
//             await pc.setRemoteDescription(message.sdp);
//             // Answer 생성
//             let sdp = await pc.createAnswer();
//             // Local에 Answer SDP 저장
//             await pc.setLocalDescription(sdp);
//             // Offer 보낸 소켓에게 Answer 보내기
//             io.to(message.socketId).emit("SAnswer", {sdp});        
//         } catch (error) {
//             console.error(error);
//         }
//     });

//     // Receiver가 요청한 Offer
//     socket.on("ROffer", async (message) => {
//         try {
//             // 보내는 PC 생성
//             let pc = sendPC(
//                 message.receiverSocketId,
//                 message.senderSocketId,
//                 socket
//             );
//             //Remote에 Offer SDP 저장
//             await pc.setRemoteDescription(message.sdp);
//             let sdp = await pc.createAnswer({
//                 offerToReceiveAudio: false,
//                 offerToReceiveVideo: false,
//             });
//             //Local에 Answer SDP 저장
//             await pc.setLocalDescription(sdp);
//             io.to(message.receiverSocketId).emit("ReceiverAnswer", {
//                 id: message.senderSocketId,
//                 sdp: sdp,
//             });
//         } catch (error) {
//             console.error(error);
//         }
//     });

//     socket.on("SCandidate", (message) => {
//         try {
//             let pc = receivePC11[message.socketId];
//             pc.addIceCandidate(new wrtc.RTCIceCandidate(message.candidate));
//         } catch (error) {
//             console.error(error);
//         }
//     });

//     socket.on("RCandidate", async (message) => {
//         try {
//             let pc = sendPC11[message.SsocketId];
//             await pc.addIceCandidate(new wrtc.RTCIceCandidate(message.candidate));
//         } catch (error) {
//             console.log(error);
//         }
//     });

//     socket.on("disconnect", () => {
//         n = 0;
//         socket.emit("end");

//     });
// });

// // 보내는 PC 생성
// function sendPC(RsocketId, SsocketId, socket) {
//     let pc = new wrtc.RTCPeerConnection(pc_config);
//     sendPC11[SsocketId] = [{id : RsocketId, pc : pc}];

//     pc.onicecandidate = (e) => {
//         io.to(RsocketId).emit("RCandidate", {
//             id: SsocketId,
//             candidate: e.candidate,
//         });
//     }

//     pc.oniceconnectionstatechange = (e) => {
//         //console.log(e);
//     }

//     //비디오 보내기
//     stream[SsocketId].getTracks().forEach((track => {
//         pc.addTrack(track, stream[SsocketId]);
//     }));

//     return pc;
// }


// // 받는 PC 생성
// function ReceivePC(socketId, socket) {
//     let pc = new wrtc.RTCPeerConnection(pc_config);
//     receivePC11[socketId] = pc;

//     //Event 처리
//     pc.onicecandidate = (e) => {
//         io.to(socketId).emit("SCandidate", {
//             candidate: e.candidate,
//         });
//     }
//     pc.oniceconnectionstatechange = (e) => {
//         //console.log(e);
//     }
//     pc.ontrack = (e) => {
//         stream[socketId] = e.streams[0];
//         io.sockets.emit("ontrack",{socketId : socketId})
//         // Server PC
//     }

//     return pc;
//}
