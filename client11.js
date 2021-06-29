
const socket = io('https://localhost:441', {secure: true});

const pc_config = {
    iceServers: [
        // {
        //   urls: 'stun:[STUN_IP]:[PORT]',
        //   'credentials': '[YOR CREDENTIALS]',
        //   'username': '[USERNAME]'
        // },
    ],
}

let PC11 = {
    addIceCandidate: function(val) {
        console.log(val);
    }
}
let localStream;
// let sendPC11;
// let receivePC11;

//--------------------------------------------------------------------

// Video Element 생성
function videoEl(who) {
    var video;
    if(who=="local") {
        video = document.createElement('video');
        video.ClassName = 'localVideo';
        video.autoplay = true;
        document.getElementsByClassName('conversation_1_1')[0].appendChild(video);
    }
    else {
        video = document.createElement('video');
        video.id = 'remoteVideo';
        video.ClassName = true;
        document.getElementsByClassName('conversation_1_1')[0].appendChild(video);
    }
    return video;
}

// Peer Connection 생성
function createPC(socket,stream) {
    let PC11 = new RTCPeerConnection(pc_config);
    // Event 처리
    PC11.onicecandidate = (e) => {
        if(e.candidate) {
            socket.emit("candidate11", {
                candidate: e.candidate,
                id: socket.id,
            });
        }
        else console.log("e.candidate is null");
    } 
    PC11.oniceconnectionstatechange = (e) => {}
    PC11.ontrack = (e) => {
        remoteVideo = videoEl("remote");
        remoteVideo.srcObject = e.streams[0];
    }
    return PC11;
}

// Offer 생성
async function Offer(socket) {
    try {
        //Offer 생성
        let sdp = await PC11.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
        });
        //Local SDP 지정
        await PC11.setLocalDescription(new RTCSessionDescription(sdp));
        console.log("offersdp : " + sdp);
        socket.emit("offer11", {
            sdp: sdp,
            id: socket.id,
        });
    } catch(error) {
        console.log(error);
    }
}

// Answer 생성
async function Answer(socket,remoteSdp) {
    try {

        await PC11.setRemoteDescription(new RTCSessionDescription(remoteSdp));

        let sdp = await PC11.createAnswer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
        });
        //Local SDP 지정
        await PC11.setLocalDescription(new RTCSessionDescription(sdp));
        console.log("answersdp : " + sdp);
        socket.emit("answer11", {
            sdp: sdp,
            id: socket.id,
        });
    } catch(error) {
        console.log(error);
    }
}

//---------------------------------------------------------------------------

// 1:1 대화 시작
socket.on("request_1_1", () => {
    
    console.log("1:1 Conversation Start");
          
    navigator.mediaDevices.getUserMedia({
        video:true,
        audio:true,
    })
    .then((stream) => {
        // 자기 비디오 띄우기
        var localVideo = videoEl("local");
        localVideo.srcObject = stream;
        localStream = stream;

        // PeerConnection 만들기
        PC11 = createPC(socket,localStream);
        // Offer 만들기
        Offer(socket); // Sender가 Server로 보내는 Offer
        // 자기 비디오 보내기
        if(stream) {
            stream.getTracks().forEach((track) => {
                PC11.addTrack(track,stream);
            });
        } else {
            console.log("No Local Stream");
        }

    })
    .catch((error) => {console.log(error)});
});

// Offer 받으면
socket.on("getOffer11", (message) => {

    // 자기 비디오 띄우기
    navigator.mediaDevices.getUserMedia({
        video:true,
        audio:true,
    })
    .then((stream) => {
        var localVideo = videoEl("local");
        localVideo.srcObject = stream;
        localStream = stream;
    })
    .catch((error) => {console.log(error)});


    if(!message.sdp) return;
    Answer(socket,message.sdp);
    // PC11.setRemoteDescription(new RTCSessionDescription(message.sdp))
    // .then(() => {
    //     //Answer 만들기
    //     Answer(socket);
    // }).catch((error) => {console.log(error);});

    //자기 비디오 보내기
    if(localStream) {
        localStream.getTracks().forEach((track) => {
            PC11.addTrack(track,localStream);
        });
    } else {
        console.log("No Local Stream");
    }

});

// Answer 받으면
socket.on("getAnswer11", async (message) => {
    try {
        if(!message.sdp) return;
        await PC11.setRemoteDescription(new RTCSessionDescription(message.sdp));
        
    } catch (error) {
        console.log(error);
    }
});

// Candidate 받으면

socket.on("getCandidate11", (message) => {
    console.log("Get Candidate" + message.candidate);
    try{
        if(!message.candidate) return;
        PC11.addIceCandidate(new RTCIceCandidate(message.candidate))
    } catch (error) {
        console.log(error);
    }
});

//2명 이상이 들어오면
socket.on("full", () => {
    alert("Please Wait... Talking with other");
});

// 1:1 대화 끝나면
socket.on("end", () => {
    alert("1:1 Conversation Finsish");
})


// // 보내는 Peer Connection
// function SPC(socket,stream) {
//     let pc = new RTCPeerConnection(pc_config);
//     // Event 처리
//     pc.onicecandidate = (e) => {
//         if(e.candidate) {
//             socket.emit("SCandidate", { // 자기 Send PC의 Candidate 
//                 candidate: e.candidate,
//                 socketId: socket.id,
//             });
//         }
//     } 
//     pc.oniceconnectionstatechange = (e) => {}
//     // Video 보내기
//     if(stream) {
//         stream.getTracks().forEach((track) => {
//             pc.addTrack(track,stream);
//         });
//     }
//     else {console.log("Error Add Track");}

//     return pc;
// }

// // 받는 PeerConnection
// function RPC(socket,SsocketId) {
//     let pc = new RTCPeerConnection(pc_config);
//     receivePC11 = pc;
//     //Event 처리
//     pc.onicecandidate = (e) => {
//         if(e.candidate) {
//             socket.emit("RCandidate", {// 자기 Receive PC의 Candidate
//                 candidate: e.candidate,
//                 socketId: socket.id,
//                 SsocketId: SsocketId,
//             });
//         }
//     }
//     pc.oniceconnectionstatechange = (e) =>{
//         //console.log(e);
//     }
//     pc.ontrack = (e) => {
//         remoteVideo = videoEl("remote");
//         remoteVideo.srcObject = e.streams[0];
//     }

//     return pc;
// }

// //Offer 생성
// async function SOffer(socket) {
//     try {
//         //Offer 생성
//         let sdp = await sendPC11.createOffer({
//             offerToReceiveAudio: false,
//             offerToReceiveVideo: false,
//         });
//         //Local SDP 지정
//         await sendPC11.setLocalDescription(new RTCSessionDescription(sdp));
//         socket.emit("SOffer", {
//             sdp: sdp,
//             socketId: socket.id,
//         });
//     } catch(error) {
//         console.log(error);
//     }
// }

// async function ROffer(pc, socket, SsocketId) {
//     try {
//         // Offer 생성
//         let sdp = await pc.createOffer({
//             offerToReceiveAudio: true,
//             offerToReceiveVideo: true,
//         });
//         // Local SDP 지정
//         receivePC11.setLocalDescription(new RTCSessionDescription(sdp));
//         socket.emit("ROffer", {
//             sdp,
//             socketId: socket.id,
//             SsocketId: SsocketId,
//         });
//     } catch (error) {
//         console.log(error);
//     }
// }




// socket.on("SAnswer", (message) => {
//     try {
//         //Remote에 Answer SDP 저장
//         sendPC11.setRemoteDescription(new RTCSessionDescription(message.sdp));
//     } catch (error) {
//         console.log(error);
//     }
// });

// socket.on("RAnswer", (message) => {
//     try {
//         //Remote에 Answer SDP 저장
//         receivePC11.setRemoteDescription(new RTCSessionDescription(message.sdp));
//     } catch (error) {
//         console.error(error);
//     }
// });

// socket.on("SCandidate", (message) => {
//     try{
//         if(!message.candidate) return;
//         sendPC11.addIceCandidate(new RTCIceCandidate(message.candidate));
//     } catch (error) {
//         console.error(error);
//     }
// });

// socket.on("RCandidate", (message) => {
//     try {
//         if(!message.candidate) return;
//         receivePC11.addIceCandidate(new RTCIceCandidate(message.candidate));
//     } catch (error) {
//         console.log(error);
//     }
// });


// // 상대방에서 비디오 받으면 받는 PC 생성
// socket.on("ontrack", (message) => {
//     try {
//         let pc = RPC(socket,message.socketId);
//         ROffer(pc,socket,message.socketId);
//     }
//     catch (error) {
//         console.log(error);
//     }
// });

