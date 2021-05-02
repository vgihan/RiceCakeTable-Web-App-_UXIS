const socket = io('https://localhost', {secure: true});

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
    ],
}

let sendPC = new RTCPeerConnection(pc_config);
let receivePCs = {};
let infoOfReceivers = {};
let receiveVideos = {};

let userId;
let roomId;
let role;

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
    if(role === 'teacher') {
        video = document.createElement('video');
        video.className = 'teacher_video';
        video.autoplay = true;
        document.getElementsByClassName('video')[0].appendChild(video);
    } else if(role === 'student') {
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
        video = document.createElement('video');
        video.className = 'student_video';
        video.autoplay = true;
        
        var container = document.getElementsByClassName('students')[0];
        
        dt.appendChild(video);
        dd.appendChild(name_txt);
        dd.appendChild(id_txt);
        dl.appendChild(dt);
        dl.appendChild(dd);
        li.appendChild(txt_bubble);
        li.appendChild(dl);
        container.appendChild(li);
    }
    return video;
}

function getUserMediaStream(){
    navigator.mediaDevices
        .getUserMedia({
            video: true,
        })
        .then((stream) => {
            const myVideo = setVideoPosition(role, userId);
            myVideo.srcObject = stream;

            var localStream = stream;

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
        })
}

function createSenderPeerConnection(socket, stream) {
    let pc = new RTCPeerConnection(pc_config);

    pc.onicecandidate = (e) =>{
        if(e.candidate) {
            socket.emit("senderCandidate", {
                candidate: e.candidate,
                senderSocketId: socket.id,
            });
        }
    }

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

    pc.onicecandidate = (e) => {
        if(e.candidate) {
            socket.emit("receiverCandidate", {
                candidate: e.candidate,
                receiverSocketId: socket.id,
                senderSocketId: socketId,
            });
        }
    }

    pc.oniceconnectionstatechange = (e) =>{
        //console.log(e);
    }

    pc.ontrack = (e) => {
        if(receiveVideos[socketId]) return;
        receiveVideos[socketId] = setVideoPosition(role, userId);
        receiveVideos[socketId].srcObject = e.streams[0];
        console.log(e.streams[0]);
    }

    return pc;
}

async function createSenderOffer(socket){
    try {
        let sdp = await sendPC.createOffer({
            offerToReceiveAudio: false,
            offerToReceiveVideo: false,
        })
        await sendPC.setLocalDescription(new RTCSessionDescription(sdp));

        socket.emit("senderOffer", {
            sdp,
            senderSocketId: socket.id,
            roomId: roomId,
        });
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
        pc.setLocalDescription(new RTCSessionDescription(sdp));
        socket.emit("receiverOffer", {
            sdp,
            receiverSocketId: socket.id,
            senderSocketId: senderSocketId,
            roomId: roomId,
        });
    } catch (error) {
        console.error(error);
    }
}

socket.on("getReceiverCandidate", (message) => {
    try {
        let pc = receivePCs[message.id];
        if(!message.candidate) return;
        pc.addIceCandidate(new RTCIceCandidate(message.candidate));
        console.log("receiver candidate 등록 완료");
    } catch (error) {
        console.log(error);
    }
});

socket.on("getSenderCandidate", (message) => {
    try{
        if(!message.candidate) return;
        sendPC.addIceCandidate(new RTCIceCandidate(message.candidate));
        console.log("sender candidate 등록 완료");
    } catch (error) {
        console.error(error);
    }
});

socket.on("getSenderAnswer", (message) => {
    try {
        sendPC.setRemoteDescription(new RTCSessionDescription(message.sdp));
        console.log("getSenderAnswer Success");
    } catch (error) {
        console.error(error);
    }
});

socket.on("getReceiverAnswer", async (message) => {
    try {
        let pc = receivePCs[message.id];
        await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
        console.log("getReceiverAnswer Success");
    } catch (error) {
        console.error(error);
    }
});

socket.on("userEnter", (message) => {
    try {
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
    if(message.role === "teacher"){
        exitUserElement = document.getElementsByClassName('teacher_video')[0];
    } else if(message.role === "student") {
        exitUserElement = document.getElementsByClassName(message.userId)[0];
    }
    exitUserElement.parentNode.removeChild(exitUserElement);
})

socket.on("allUsers", (message) => {
    let len = message.users.length;
    for(let i=0; i<len; i++) {
        let pc = createReceiverPeerConnection(message.users[i].id, socket, message.users[i].role, message.users[i].userId);
        createReceiverOffer(pc, socket, message.users[i].id, message.users[i].roomId);
    }
})

