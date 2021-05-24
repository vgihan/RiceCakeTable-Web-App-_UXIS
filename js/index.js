const socket = io('https://edu.uxis.co.kr', {secure: true});

window.addEventListener('load', () => {
    document.getElementsByClassName('wrap')[0].style.display = "none";
});

window.addEventListener('beforeunload', () => {
    socket.emit("disconnect");
});

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

let sendPC;
let receivePCs = {};
let infoOfReceivers = {};
let receiveVideos = {};

let userId;
let roomId;
let role;

let nextVideoPos = [70, 20];

function register(){
    document.getElementsByClassName('wrap')[0].style.display = "block";
    document.getElementsByClassName('login')[0].style.display = "none";

    userId = document.getElementById('userId').value;
    roomId = document.getElementById('roomId').value;
    
    role = document.getElementById('role');
    role = role.options[role.selectedIndex].value;

    getUserMediaStream();
}

function setVideoPosition(role, userId){
    var video;

    video = document.createElement('video');
    video.className = 'video_' + userId;
    video.autoplay = true;
	video.playsinline = true;
    document.getElementsByClassName('video')[0].appendChild(video);
    
    var li = document.createElement('li');
    li.className = userId;
    var dt = document.createElement('dt');
    var dd = document.createElement('dd');
    var dl = document.createElement('dl');
    var txt_bubble = document.createElement('div');
    txt_bubble.className = 'txt_bubble';
    var name_txt = document.createElement('p');
    name_txt.className = 'name_txt';
    name_txt.innerText = userId;
    var id_txt = document.createElement('p');
    id_txt.className = 'id_txt';
    id_txt.innerText = userId;
        
    var container = document.getElementsByClassName('students')[0];
        
    dd.appendChild(name_txt);
    dd.appendChild(id_txt);
    dl.appendChild(dt);
    dl.appendChild(dd);
    li.appendChild(txt_bubble);
    li.appendChild(dl);
    container.appendChild(li);

    return video;
}

function getUserMediaStream(){
    navigator.mediaDevices
        .getUserMedia({
            audio: true,
            video: true,
        })
        .then((stream) => {
            const myVideo = setVideoPosition(role, userId);
            selfStream = new MediaStream();
            selfStream.addTrack(stream.getTracks()[1]);
            myVideo.srcObject = selfStream;
            
            localStream = stream;

            sendPC = createSenderPeerConnection(socket, localStream);
            createSenderOffer(socket);

            socket.emit("joinRoom", {
                userId: userId,
                senderSocketId: socket.id,
                roomId: roomId,
                role: role,
            });
        })
        .catch(error => {
            console.error(`getUserMedia error: ${error}`);
        		
            socket.emit("joinRoom", {
                userId: userId,
                senderSocketId: socket.id,
                roomId: roomId,
                role: role,
            });
		});
}

function createSenderPeerConnection(socket, stream) {
    let pc = new RTCPeerConnection(pc_config);
/*
    pc.onicecandidate = (e) =>{
        console.log("onicecandidate!");
	if(e.candidate) {
            socket.emit("senderCandidate", {
                candidate: e.candidate,
                senderSocketId: socket.id,
            });
        }
    }
*/
    pc.oniceconnectionstatechange = (e) => {
        //console.log(e);
    }

    if(stream) {
        stream.getTracks().forEach((track) => {
            pc.addTrack(track, stream);
        });
    } else {
        console.log("no localStream");
    }

    return pc;
}

function createReceiverPeerConnection(socketId, socket, role, userId) {
    let pc = new RTCPeerConnection(pc_config);
    
    receivePCs[socketId] = pc;
/*
    pc.onicecandidate = (e) => {
        if(e.candidate) {
            socket.emit("receiverCandidate", {
                candidate: e.candidate,
                receiverSocketId: socket.id,
                senderSocketId: socketId,
            });
        }
    }
*/
    pc.oniceconnectionstatechange = (e) =>{
        //console.log(e);
    }

    pc.ontrack = (e) => {
        if(receiveVideos[socketId]) return;
        receiveVideos[socketId] = setVideoPosition(role, userId);
        receiveVideos[socketId].srcObject = e.streams[0];
        console.log(e.streams[0].getTracks());
    }

    return pc;
}

async function createSenderOffer(socket){
    try {
        let sdp = await sendPC.createOffer({
            offerToReceiveAudio: false,
            offerToReceiveVideo: false,
        });
        await sendPC.setLocalDescription(new RTCSessionDescription(sdp));
	console.log("1");
        socket.emit("senderOffer", {
            sdp,
            senderSocketId: socket.id,
            roomId: roomId,
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
            roomId: roomId,
        });
							
    	pc.onicecandidate = (e) => {
    	    if(e.candidate) {
    	        socket.emit("receiverCandidate", {
    	            candidate: e.candidate,
    	            receiverSocketId: socket.id,
    	            senderSocketId: socketId,
    	        });
    	    }
    	}
    } catch (error) {
        console.error(error);
    }
}

socket.on("getReceiverCandidate", (message) => {
    try {
        let pc = receivePCs[message.id];
        if(!message.candidate) return;
        pc.addIceCandidate(new RTCIceCandidate(message.candidate));
    } catch (error) {
        console.log(error);
    }
});

socket.on("getSenderCandidate", (message) => {
    try{
        if(!message.candidate) return;
        sendPC.addIceCandidate(new RTCIceCandidate(message.candidate));
    } catch (error) {
        console.error(error);
    }
});

socket.on("getSenderAnswer", (message) => {
    try {	
    	console.log("getSenderAnswer");
        sendPC.setRemoteDescription(new RTCSessionDescription(message.sdp));
    } catch (error) {
        console.error(error);
    }
});

socket.on("getReceiverAnswer", async (message) => {
    try {
        let pc = receivePCs[message.id];
        if(pc.signalingState === 'stable') return;
        console.log(pc.signalingState);
        await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
    } catch (error) {
        console.error(error);
    }
});

socket.on("userEnter", (message) => {
    try {
        console.log("userEnter!!!!!!!!!!!!");
        let pc = createReceiverPeerConnection(message.id, socket, message.role, message.userId);
        createReceiverOffer(pc, socket, message.id, roomId);
        infoOfReceivers[message.id] = {
            userId: message.userId,
            role: message.role,
        };
    } catch (error) {
        console.error(error);
    }
});

socket.on("userExit", (message) => {
    receivePCs[message.id].close();
    delete receivePCs[message.id];
    var exitUserElement;
    exitUserElement = document.getElementsByClassName(message.userId)[0];
    exitUserVideo = document.getElementsByClassName('video_' + message.userId)[0];
    exitUserElement.parentNode.removeChild(exitUserElement);
    exitUserVideo.parentNode.removeChild(exitUserVideo);
});

socket.on("allUsers", (message) => {
    let len = message.users.length;
    for(let i=0; i<len; i++) {
        let pc = createReceiverPeerConnection(message.users[i].id, socket, message.users[i].role, message.users[i].userId);
        createReceiverOffer(pc, socket, message.users[i].id, message.users[i].roomId);
    }
});

