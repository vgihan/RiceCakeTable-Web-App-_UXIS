const socket = io('https://localhost', {secure: true});

let sendPC;         //보내는 역할의 peerConnection 객체
let receivePCs = {};    //받는 역할의 peerConnection 객체

let receiveVideos = {}; //방안에 존재하는 user들에게서 스트림을 받기 위한 peerConnection 객체들
let selfStream;     //자신의 비디오를 표시할 스트림

const userName = document.getElementById('user_name').innerHTML;
const roomId = document.getElementById('room_id').innerHTML;
getUserMediaStream(userName, roomId);

//브라우저를 종료했을 때
window.onbeforeunload = (e) => {
    socket.emit("disconnect");
};
window.history.forward();

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

// 뒤로가기 금지
function noBack(){
    window.history.forward();
}

// view에서 비디오 자리 세팅
function setVideoPosition(userName, isLocal){
    var video = document.createElement('video');
    video.className = 'video_' + userName;
    video.autoplay = true;
	video.playsinline = true;
    
    var li = document.createElement("li");
    var v_view = document.createElement("div");
    var info_ctxt = document.createElement("div");
    var nicknm = document.createElement("div");
    var chat_1_1 = document.createElement("div");
    var div = document.createElement("div");
    var a = document.createElement("a");

    a.tabIndex = "0";
    a.innerHTML = "1 : 1 대화신청";
    a.onclick = request_1_1;
    chat_1_1.className = "chat_1_1";
    nicknm.className = "nicknm";
    info_ctxt.className = "info_ctxt";
    v_view.className = "v_view";
    li.className = userName;

    nicknm.innerHTML = userName;

    var container = document.getElementsByClassName('slick-slide slick-current slick-active')[0];
        
    div.appendChild(a);
    chat_1_1.appendChild(div);
    info_ctxt.appendChild(nicknm);
    v_view.appendChild(video);
    v_view.appendChild(info_ctxt);
    if(!isLocal) v_view.appendChild(chat_1_1);
    li.appendChild(v_view);
    container.appendChild(li);

    return video;
}

function request_1_1() {
    
}

// user의 카메라와 마이크에 접근하여 스트림 받은 뒤 peerconnection 객체 생성하고 offer전송(통신 시작)
function getUserMediaStream(userName, roomId){
    console.log("getUserMediaStream");
    navigator.mediaDevices
        .getUserMedia({
            audio: true,
            video: true,
        })
        .then(stream => {
            const myVideo = setVideoPosition(userName, true);
            selfStream = new MediaStream();
            selfStream.addTrack(stream.getVideoTracks()[0]);
            myVideo.srcObject = selfStream;
            
            sendPC = createSenderPeerConnection(stream);
            createSenderOffer(socket, roomId, userName);

            socket.emit("joinRoom", {
                senderSocketId: socket.id,
                roomId: roomId,
            });
        })
        .catch(error => {
            console.error(`getUserMedia error: ${error}`);
        		
            socket.emit("joinRoom", {
                senderSocketId: socket.id,
                roomId: roomId,
            });
		});
}

//스트림 보내는 역할의 peerConnection 객체 생성
function createSenderPeerConnection(stream) {
    let pc = new RTCPeerConnection(pc_config);
    
    pc.oniceconnectionstatechange = (e) => {
        //console.log(e);
    }

    if(stream) {
        console.log("check");
        var videoTrack = stream.getVideoTracks()[0];
        var audioTrack = stream.getAudioTracks()[0];
        pc.addTrack(videoTrack, stream);
        pc.addTrack(audioTrack, stream);
    } else {
        console.log("no localStream");
    }

    return pc;
}

//스트림 받는 역할의 peerConnection 객체 생성
function createReceiverPeerConnection(socketId, userName) {
    let pc = new RTCPeerConnection(pc_config);
    
    receivePCs[socketId] = pc;
    
    pc.oniceconnectionstatechange = (e) =>{
        //console.log(e);
    }

    //스트림 보내는 쪽의 peerConnection에서 addTrack시 이벤트 발생
    pc.ontrack = (e) => {
        if(receiveVideos[socketId]) return;
        receiveVideos[socketId] = setVideoPosition(userName, false);
        receiveVideos[socketId].srcObject = e.streams[0];
    }

    return pc;
}

//보내는 역할의 peerConnection 객체에서 offer 전송 (통신 시작)
async function createSenderOffer(socket, roomId, userName){
    try {
        let sdp = await sendPC.createOffer({
            offerToReceiveAudio: false,
            offerToReceiveVideo: false,
        });
        await sendPC.setLocalDescription(new RTCSessionDescription(sdp));
        socket.emit("senderOffer", {
            sdp,
            senderSocketId: socket.id,
            roomId: roomId,
            userName: userName
        });
    	sendPC.onicecandidate = (e) =>{
			console.log("onicecandidate");
        	if(e.candidate) {
            	socket.emit("senderCandidate", {
                	candidate: e.candidate,
                	senderSocketId: socket.id,
            	});
        	}
    	}
    } catch(error) {
        console.log(error);
    }
}

//받는 역할의 peerConnection 객체에서 offer 전송 (통신 시작)
async function createReceiverOffer(pc, socket, senderSocketId, roomId) {
    try {
        let sdp = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(new RTCSessionDescription(sdp));
        socket.emit("receiverOffer", {
            sdp,
            receiverSocketId: socket.id,
            senderSocketId: senderSocketId,
        });
							
    	pc.onicecandidate = (e) => {
    	    if(e.candidate) {
    	        socket.emit("receiverCandidate", {
    	            candidate: e.candidate,
    	            receiverSocketId: socket.id,
    	            senderSocketId: senderSocketId,
    	        });
    	    }
    	}
    } catch (error) {
        console.error(error);
    }
}

//서버입장에서 받는 역할의 peerConnection 객체에서 수신한 candidate 메시지
socket.on("getReceiverCandidate", (message) => {
    try {
        let pc = receivePCs[message.id];
        if(!message.candidate) return;
        pc.addIceCandidate(new RTCIceCandidate(message.candidate));
    } catch (error) {
        console.log(error);
    }
});

//서버입장에서 보내는 역할의 peerConnection 객체에서 수신한 candidate 메시지
socket.on("getSenderCandidate", (message) => {
    try{
        if(!message.candidate) return;
        sendPC.addIceCandidate(new RTCIceCandidate(message.candidate));
    } catch (error) {
        console.error(error);
    }
});

//서버입장에서 보내는 역할의 peerConnection 객체에서 수신한 answer 메시지
socket.on("getSenderAnswer", (message) => {
    try {	
    	console.log("getSenderAnswer");
        sendPC.setRemoteDescription(new RTCSessionDescription(message.sdp));
    } catch (error) {
        console.error(error);
    }
});

//서버입장에서 받는 역할의 peerConnection 객체에서 수신한 answer 메시지
socket.on("getReceiverAnswer", async (message) => {
    try {
        let pc = receivePCs[message.id];
        console.log(receivePCs);
        if(pc.signalingState === 'stable') return;
        console.log(pc.signalingState);
        await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
    } catch (error) {
        console.error(error);
    }
});

//user가 들어오면 이미 들어와있던 user에게 수신되는 이벤트
socket.on("userEnter", (message) => {
    try {
        let pc = createReceiverPeerConnection(message.socketId, message.userName);
        createReceiverOffer(pc, socket, message.socketId, message.roomId);
        console.log("userEnter!!!!!!!!!!!!");
    } catch (error) {
        console.error(error);
    }
});

//같은 방에 있던 user가 나가면 그 방 안에있던 모든 user들에게 전송되는 이벤트
socket.on("userExit", (message) => {
    let socketId = message.id;
    let userName = message.userName;

    receivePCs[socketId].close();
    delete receivePCs[socketId];
    
    var exitUserElement = document.getElementsByClassName(userName)[0];
    exitUserElement.parentNode.removeChild(exitUserElement);
});

//처음 방에 접속한 user가 이미 방안에 들어와있던 user들의 정보를 받기 위한 이벤트
socket.on("allUsers", (message) => {
    let len = message.users.length;
    console.log("allUsers");
    console.log(message);
    for(let i=0; i<len; i++) {
        var socketId = message.users[i].socket_id;
        var userName = message.users[i].user_name;
        var roomId = message.users[i].room_id;
        let pc = createReceiverPeerConnection(socketId, userName);
        createReceiverOffer(pc, socket, socketId, roomId);
    }
});