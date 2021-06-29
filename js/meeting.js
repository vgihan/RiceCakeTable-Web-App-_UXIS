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

let receiveVideos = {}; //방안에 존재하는 user들에게서 스트림을 받기 위한 peerConnection 객체들
let selfStream;     //자신의 비디오를 표시할 스트림
let userStreams = {};

let userName;

let roomLeader;
let roomId;
let roomType;
let numOfUsers;

let candidateSwitch;

let myName;
let myRoom;
let roomTime;

onload();

function onload() {
    const userName = document.getElementById('user_name').innerHTML;
    const roomId = document.getElementById('room_id').innerHTML;
    myName=userName;
    myRoom=roomId

    userName = document.getElementById('user_name').innerHTML;
    roomId = document.getElementById('room_id').innerHTML;


    var today = new Date();
    roomTime = today.getTime();
    socket.emit("set_roomTime", {time:today.getTime(), roomId : myRoom});
    socket.emit("roomInfo", {
        roomId: roomId,
        userName: userName
    });

    meetingStart(userName, roomId);
}

//브라우저를 종료했을 때
window.onbeforeunload = (e) => {
    socket.emit("disconnect", {purpose: roomType});
};
window.history.forward();

document.getElementsByClassName('refusal')[0].onclick = (e) => {
    document.getElementsByClassName('chat_accept')[0].style = 'display: none;';
};

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
    a.id = userName;
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

function request_1_1(e) {
    socket.emit("request_1_1", {
        socketId: socket.id,
        target: e.target.id,
    });
}

// user의 카메라와 마이크에 접근하여 스트림 받은 뒤 peerconnection 객체 생성하고 offer전송(통신 시작)
function meetingStart(userName, roomId){
    console.log("getUserMediaStream");
    navigator.mediaDevices
        .getUserMedia({
            audio: true,
            video: true,
        })
        .then(async stream => {
            const myVideo = setVideoPosition(userName, true);
            selfStream = new MediaStream();
            selfStream.addTrack(stream.getVideoTracks()[0]);
            myVideo.srcObject = selfStream;
            
            candidateSwitch = false;

            sendPC['meeting'] = createSenderPeerConnection(stream, 'meeting');
            let offer = await createSenderOffer(sendPC['meeting']);

            await socket.emit("senderOffer", {
                offer,
                senderSocketId: socket.id,
                roomId: roomId,
                userName: userName,
                purpose: 'meeting',
            });

            candidateSwitch = true;

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

function shareStart() {
    var shareViewTags = `<div>
                            <video id='share_video' autoplay playsinline>
                         </div>`;
    var selfViewTags = `<div>
                            <video id='self_video' autoplay playsinline>
                            <div class="info_ctxt">
                                <div class="nicknm">${userName}</div>
                            </div>
                        </div>`;
    var endButton =    `<p>지금은</p>
                        <p>PC 화면 공유 중</p>
                        <p>입니다</p>
                        <a href="meeting.html">종료하기</a>`;

    document.getElementsByClassName('view_all')[0].innerHTML = shareViewTags;
    document.getElementsByClassName('self_view')[0].innerHTML = selfViewTags;
    document.getElementsByClassName('share_end')[0].innerHTML = endButton;

    document.getElementsByClassName('view_all')[0].style = 'display: block;';
    document.getElementsByClassName('self_view')[0].style = 'display: block;';
    document.getElementsByClassName('share_end')[0].style = 'display: block;';
    document.getElementsByClassName('inner')[0].style = 'display: none;';

    navigator.mediaDevices.getDisplayMedia({
        audio:true,
        video:true
    }).then(async function(stream){ 
        document.getElementById('share_video').srcObject = stream;
    }).catch(error => {
            console.log('error display stream',error);
    });

    document.getElementById('self_video').srcObject = selfStream;
}

//스트림 보내는 역할의 peerConnection 객체 생성
function createSenderPeerConnection(stream, purpose) {
    let pc = new RTCPeerConnection(pc_config);
    
    pc.oniceconnectionstatechange = (e) => {
        //console.log(e);
    }

    pc.onicecandidate = (e) =>{
        if(!candidateSwitch) return;
        console.log("onicecandidate");
        if(e.candidate) {
            socket.emit("senderCandidate", {
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
        if(!candidateSwitch) return;
        console.log("receiverIceCandidate");
        if(e.candidate) {
            socket.emit("receiverCandidate", {
                candidate: e.candidate,
                receiverSocketId: socket.id,
                senderSocketId: senderSocketId,
                purpose: purpose,
            });
        }
    }

    //스트림 보내는 쪽의 peerConnection에서 addTrack시 이벤트 발생
    pc.ontrack = (e) => {
        ontrackHandler(stream, userName, senderSocketId);
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


function send_msg() {
    // 입력되어있는 데이터 가져오기
    var message = document.getElementById('msg_box').value
    // 가져왔으니 데이터 빈칸으로 변경
    document.getElementById('msg_box').value = ''
  
    // 내가 전송할 메시지 클라이언트에게 표시
    const chat_inner = document.getElementById('chat_inners');
    
    if(message !='' & message!='\n'){
        chat_inner.innerHTML += `<li><h1>${myName}</h1><p>${message}</p></li>`
    
        // 서버로 message 이벤트 전달 + 데이터와 함께
        console.log("message:",message)
        socket.emit('message', {type: 'message', message: message, roomId : myRoom, userName : myName, roomTime:roomTime})
        
        
        var chat_scroll = document.getElementById('mCSB_1_container');  //스크롤 밑으로 내리기
        //console.log("scroll height:",chat_scroll.scrollHeight)
        if(chat_scroll.scrollHeight>460){
            var scroll_down= -(chat_scroll.scrollHeight -470)
            chat_scroll.style.top = `${scroll_down}px`
        }
        //console.log("chat height:",chat_scroll.style.top)
    }
    
}
function enterkey() { 
    if (window.event.keyCode == 13) {
         // 엔터키가 눌렸을 때 
         send_msg();
    } 

function meetingOntrackHandler(stream, userName, senderSocketId) {
    if(receiveVideos[senderSocketId]) return;
    userStreams[senderSocketId] = stream;
    receiveVideos[senderSocketId] = setVideoPosition(userName, false);
    receiveVideos[senderSocketId].srcObject = stream;

}

//서버입장에서 받는 역할의 peerConnection 객체에서 수신한 candidate 메시지
socket.on("getReceiverCandidate", (message) => {
    try {
        let pc = receivePCs[message.purpose][message.id];
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
        sendPC[message.purpose].addIceCandidate(new RTCIceCandidate(message.candidate));
    } catch (error) {
        console.error(error);
    }
});

//서버입장에서 보내는 역할의 peerConnection 객체에서 수신한 answer 메시지
socket.on("getSenderAnswer", (message) => {
    try {
        sendPC[message.purpose].setRemoteDescription(new RTCSessionDescription(message.answer));
    } catch (error) {
        console.error(error);
    }
});

//서버입장에서 받는 역할의 peerConnection 객체에서 수신한 answer 메시지
socket.on("getReceiverAnswer", (message) => {
    try {
        let pc = receivePCs[message.purpose][message.id];
        if(pc.signalingState === 'stable') return;
        pc.setRemoteDescription(new RTCSessionDescription(message.answer));
    } catch (error) {
        console.error(error);
    }
});

//user가 들어오면 이미 들어와있던 user에게 수신되는 이벤트
socket.on("userEnter", async (message) => {
    try {
        candidateSwitch = false;

        let pc = createReceiverPeerConnection(message.socketId, message.userName, 'meeting', meetingOntrackHandler);
        let offer = await createReceiverOffer(pc);
        
        receivePCs['meeting'][message.socketId] = pc;

        await socket.emit("receiverOffer", {
            offer,
            receiverSocketId: socket.id,
            senderSocketId: message.socketId,
            purpose: 'meeting'
        });

        candidateSwitch = true;

        document.getElementsByClassName('c_r')[0].innerHTML = ++numOfUsers + '명';
        document.getElementById('num_user_span').innerHTML = numOfUsers + '명';
    } catch (error) {
        console.error(error);
    }
});

//같은 방에 있던 user가 나가면 그 방 안에있던 모든 user들에게 전송되는 이벤트
socket.on("userExit", (message) => {
    let socketId = message.id;
    let userName = message.userName;

    document.getElementsByClassName('c_r')[0].innerHTML = --numOfUsers + '명';
    document.getElementById('num_user_span').innerHTML = numOfUsers + '명';

    receivePCs[message.purpose][socketId].close();
    delete receivePCs[message.purpose][socketId];
    
    var exitUserElement = document.getElementsByClassName(userName)[0];
    exitUserElement.parentNode.removeChild(exitUserElement);
});

//처음 방에 접속한 user가 이미 방안에 들어와있던 user들의 정보를 받기 위한 이벤트
socket.on("allUsers", async (message) => {
    let len = message.users.length;
    console.log("allUsers");
    console.log(message);
    for(let i=0; i<len; i++) {
        var socketId = message.users[i].socket_id;
        var userName = message.users[i].user_name;

        let pc = createReceiverPeerConnection(socketId, userName, 'meeting', meetingOntrackHandler);
        let offer = await createReceiverOffer(pc);

        receivePCs['meeting'][socketId] = pc;

        await socket.emit("receiverOffer", {
            offer,
            receiverSocketId: socket.id,
            senderSocketId: socketId,
            purpose: 'meeting',
        });	
    }
});

socket.on("roomInfo", (message) => {
    roomLeader = message.roomLeader;
    numOfUsers = message.numOfUsers;
    roomType = message.roomType;

    document.getElementsByClassName('c_r')[0].innerHTML = numOfUsers + '명';
    document.getElementsByClassName('c_y')[0].innerHTML = roomLeader;
    document.getElementById('num_user_span').innerHTML = numOfUsers + '명';
});

socket.on("get_1_1_request", () => {
    document.getElementsByClassName('chat_accept')[0].setAttribute('style', 'display:block;');
});

socket.on("update", (data) => {
    const chat_inner = document.getElementById('chat_inners');
    chat_inner.innerHTML += `<li><h1>${data.userName}</h1><p>${data.message}</p></li>`
    var chat_scroll = document.getElementById('mCSB_1_container');  //스크롤 밑으로 내리기
    //console.log("scroll height:",chat_scroll.scrollHeight)
    if(chat_scroll.scrollHeight>460){
        var scroll_down= -(chat_scroll.scrollHeight -470)
        chat_scroll.style.top = `${scroll_down}px`
    }
    //console.log("chat height:",chat_scroll.style.top)

});
socket.on("get_roomTime", (data) => {
    roomTime=data.time
    //console.log("roomTime: ",roomTime)
});

socket.on('get_chat', function(data) {
    console.log("get_chat!!!")
    const chat_inner = document.getElementById('chat_inners');
    /*이전 대화목록 받아오기*/
    for(var i=0; i<data.length; i++){
        chat_inner.innerHTML += `<li><h1>${data[i].userName}</h1><p>${data[i].message}</p></li>`
    }

    var chat_scroll = document.getElementById('mCSB_1_container');  //스크롤 밑으로 내리기
    if(chat_scroll.scrollHeight>460){
        var scroll_down= -(chat_scroll.scrollHeight -470)
        chat_scroll.style.top = `${scroll_down}px`
    }
});