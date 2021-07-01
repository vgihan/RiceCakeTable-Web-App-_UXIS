const socket = io('https://localhost', {secure: true});

const pc_config = {
    iceServers: [
        {
            urls: "stun:edu.uxis.co.kr"
        },
        {
            urls: "turn:edu.uxis.co.kr?transport=tcp",
                    "username": "webrtc",
                    "credential": "webrtc100!"
        }
    ]
}
//----------------------------------RUN TIME DATA-----------------------------------------
let sendPC = {
    'meeting':{},
    'seminar':{},
    'share':{},
};
let receivePCs = {
    'meeting':{},
    'seminar':{},
    'share':{},
};

let receiveVideos = {
    'meeting':{},
    'seminar':{},
    'share':{},
};
let selfStream;
let userStreams = {
    'meeting': {},
    'seminar': {},
    'share': {},
};

let userName;   //자신의 유저이름
let socketId = socket.id;

let roomLeader; //같은 방 생성자
let roomId;     //방 id
let roomType;   //방 타입 (meeting or seminar)
let numOfUsers; //방 접속 인원 수
let roomTime;   //
let shareSwitch = false;   //화면 공유 스위치 (방 당 1명 밖에 공유 못함)
let shareSocketId;
//----------------------------------------------------------------------------------------

window.addEventListener('unload', (ev) => {  
    socket.emit(`meeting_disconnect`);
    shareDisconnect();
});

onload();

function onload() {
    userName = document.getElementById('user_name').innerHTML;
    roomId = document.getElementById('room_id').innerHTML;
    roomType = document.getElementById('room_type').innerHTML;

    var today = new Date();
    roomTime = today.getTime();
    socket.emit("set_room_time", {time:today.getTime(), roomId : roomId});

    socket.emit("room_info", {
        roomId: roomId,
        userName: userName,
        roomType: roomType,
    });
}

//스트림 보내는 역할의 peerConnection 객체 생성
function createSenderPeerConnection(stream, purpose) {
    let pc = new RTCPeerConnection(pc_config);
    
    pc.oniceconnectionstatechange = (e) => {
        //console.log(e);
    }

    pc.onicecandidate = (e) =>{
        if(e.candidate) {
            socket.emit("sender_candidate", {
                candidate: e.candidate,
                senderSocketId: socket.id,
                purpose: purpose,
            });
        }
    }

    if(stream) {
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
function createReceiverPeerConnection(senderSocketId, userName, purpose, ontrackHandler) {
    let pc = new RTCPeerConnection(pc_config);
    
    pc.oniceconnectionstatechange = (e) =>{
        //console.log(e);
    }

    pc.onicecandidate = (e) => {
        if(e.candidate) {
            socket.emit("receiver_candidate", {
                candidate: e.candidate,
                receiverSocketId: socket.id,
                senderSocketId: senderSocketId,
                purpose: purpose,
            });
        }
    }

    //스트림 보내는 쪽의 peerConnection에서 addTrack시 이벤트 발생
    pc.ontrack = (e) => {
        ontrackHandler(e.streams[0], userName, senderSocketId);
    }

    return pc;
}

//보내는 역할의 peerConnection 객체에서 offer 전송 (통신 시작)
async function createSenderOffer(pc){
    try {
        let offer = await pc.createOffer({
            offerToReceiveAudio: false,
            offerToReceiveVideo: false,
        });
        await pc.setLocalDescription(new RTCSessionDescription(offer));
        
        console.log(offer);

    	return offer;
    } catch(error) {
        console.log(error);
    }
}

//받는 역할의 peerConnection 객체에서 offer 전송 (통신 시작)
async function createReceiverOffer(pc) {
    try {
        let offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(new RTCSessionDescription(offer));
        	
    	return offer;
    } catch (error) {
        console.error(error);
    }
}

//서버입장에서 받는 역할의 peerConnection 객체에서 수신한 candidate 메시지
socket.on("get_receiver_candidate", (message) => {
    try {
        let pc = receivePCs[message.purpose][message.id];
        if(!message.candidate) return;
        if(!pc) return;
        pc.addIceCandidate(new RTCIceCandidate(message.candidate));
    } catch (error) {
        console.log(error);
    }
});

//서버입장에서 보내는 역할의 peerConnection 객체에서 수신한 candidate 메시지
socket.on("get_sender_candidate", (message) => {
    try{
        let pc = sendPC[message.purpose];
        if(!message.candidate) return;
        if(!pc) return;
        pc.addIceCandidate(new RTCIceCandidate(message.candidate));
    } catch (error) {
        console.error(error);
    }
});

//클라이언트 입장에서 보내는 역할의 peerConnection 객체에서 수신한 answer 메시지
socket.on("get_sender_answer", (message) => {
    try {
        sendPC[message.purpose].setRemoteDescription(new RTCSessionDescription(message.answer));
    } catch (error) {
        console.error(error);
    }
});

//클라이언트 입장에서 받는 역할의 peerConnection 객체에서 수신한 answer 메시지
socket.on("get_receiver_answer", (message) => {
    try {
        let pc = receivePCs[message.purpose][message.id];
        if(pc.signalingState === 'stable') return;
        pc.setRemoteDescription(new RTCSessionDescription(message.answer));
    } catch (error) {
        console.error(error);
    }
});

//user가 들어오면 이미 들어와있던 user에게 수신되는 이벤트
socket.on("user_enter", async (message) => {
    userEnterHandler(message);
});

//같은 방에 있던 user가 나가면 그 방 안에있던 모든 user들에게 전송되는 이벤트
socket.on("user_exit", (message) => {
    userExitHandler(message);
});

//처음 방에 접속한 user가 이미 방안에 들어와있던 user들의 정보를 받기 위한 이벤트
socket.on("all_users", (message) => {
    allUsersHandler(message);
});

socket.on("room_info", (message) => {
    roomLeader = message.roomLeader;
    numOfUsers = message.numOfUsers;
    roomType = message.roomType;
    
    document.getElementsByClassName('c_r')[0].innerHTML = numOfUsers + '명';
    document.getElementsByClassName('c_y')[0].innerHTML = message.leaderName;
    document.getElementsByClassName('c_r')[1].innerHTML = roomId;
    document.getElementById('num_user_span').innerHTML = numOfUsers + '명';

    startFunction(message.userName, roomId, roomLeader);
});

socket.on("update", (data) => {
    update(data);
});

socket.on("get_room_time", (data) => {
    roomTime=data.time
});

socket.on('get_chat', function(data) {
    getChat(data);
});

socket.on("get_1_1_request", (message) => {
    get11Request(message);
});

socket.on("share_request", (message) => {
    shareRequestHandler(message);
});

socket.on("share_disconnect", () => {
    responseShareDisconnect();
});

socket.on("share_possible", () => {
    shareStart();
});