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

let receiveVideos = {}; //방안에 존재하는 user들에게서 스트림을 받기 위한 peerConnection 객체들
let selfStream;     //자신의 비디오를 표시할 스트림
let userStreams = {};   //같은 방

let userName;   //자신의 유저이름

let roomLeader; //같은 방 생성자
let roomId;     //방 id
let roomType;   //방 타입 (meeting or seminar)
let numOfUsers; //방 접속 인원 수
let roomTime;   //
let shareSwitch = {};   //화면 공유 스위치 (방 당 1명 밖에 공유 못함)
let is_Leader;

let startFunction = {
    'meeting': meetingStart,
    'seminar': seminarStart,
    'share': shareStart,
};

let ontrackHandler = {
    'meeting': meetingOntrackHandler,
    'seminar': seminarOntrackHandler,
    //'share': shareOntrackHandler,
};


let allUsersHandler = {
    'meeting': meetingAllUsersHandler,
    'seminar' : seminarAllUsersHandler,
};
/*
let userExitHandler = {
    'meeting': meetingUserExitHandler,
    'seminar': seminarUserExitHandler,
    'share': shareUserExitHandler,
};
*/
let userEnterHandler = {
    'meeting': meetingUserEnterHandler,
    'seminar': seminarUserEnterHandler,
    //'share': shareUserEnterHandler,
};

//----------------------------------------------------------------------------------------

onload();
function meetingStart(userName, roomId, roomLeader){console.log("ㅈ댐")}
async function meetingAllUsersHandler(message) {console.log("ㅈ댐")}
function meetingOntrackHandler(stream, userName, senderSocketId) {console.log("ㅈ댐")}
async function meetingUserEnterHandler(message) {}

function onload() {
    userName = document.getElementById('user_name').innerHTML;
    
    console.log("이름:",document.getElementById('user_name').innerHTML)
    
    roomId = document.getElementById('room_id').innerHTML;
    console.log("방이름:",roomId)
    roomType = document.getElementById('room_type').innerHTML; //seminar
    
    var today = new Date();
    console.log("today:",today.getTime())
    roomTime = today.getTime();
    socket.emit("set_roomTime", {time:roomTime, roomId : roomId});

    socket.emit("roomInfo", {
        roomId: roomId,
        userName: userName,
        roomType: roomType,
    });
}

//브라우저를 종료했을 때
window.onbeforeunload = (e) => {
    socket.emit("disconnect");
};
window.history.forward();

// 뒤로가기 금지
function noBack(){
    window.history.forward();
}

function setSeminarVideo(userName, isLocal, isLeader) {
    if(!isLeader) {

        var container = document.getElementsByClassName('slick-slide slick-current slick-active')[0];
        var li = document.createElement('li');
        var v_view = document.createElement('div');
        var info_ctxt = document.createElement('div');
        var nicknm = document.createElement('div');

        nicknm.innerHTML = userName;

        info_ctxt.appendChild(nicknm);
        v_view.appendChild(info_ctxt);
        li.appendChild(v_view);
        container.appendChild(li);

        return;

    } else {

        var container = document.getElementsByClassName('cont');
        var view_all = document.createElement('div');
        var div = document.createElement('div');
        var video = document.createElement('video');

        video.id = `video_${userName}`;
        video.autoplay = true;

        div.appendChild(video);
        view_all.appendChild(div);
        container.appendChild(view_all);
        
        return video;
    }
}
function setSeminarVideo(userName, isLocal, isLeader) {
    if(!isLeader) {
        console.log("이 로그가 뜬다면 학생도 video가 설정되므로 뭔가 잘못된거임")
        var container = document.getElementsByClassName('slick-slide slick-current slick-active')[0];
        var li = document.createElement('li');
        var v_view = document.createElement('div');
        var info_ctxt = document.createElement('div');
        var nicknm = document.createElement('div');

        nicknm.innerHTML = userName;

        info_ctxt.appendChild(nicknm);
        v_view.appendChild(info_ctxt);
        li.appendChild(v_view);
        container.appendChild(li);

        return;

    } else {
        
        var container = document.getElementsByClassName('view_all')[0];
        var view_all = document.createElement('div');
        var div = document.createElement('div');
        var video = document.createElement('video');

        video.id = `video_${userName}`;
        video.autoplay = true;

        div.appendChild(video);
        view_all.appendChild(div);
        container.appendChild(view_all);
        
        return video;
    }
}

function seminarStart(userName, roomId, roomLeader) {
    var torf;
    if(is_Leader ===true) torf=true;
    else torf=false;
    navigator.mediaDevices
        .getUserMedia({
            audio: torf,
            video: torf,
        })
        .then(async stream => {
            const myVideo = setSeminarVideo(userName, true, is_Leader);
            selfStream = new MediaStream();
            selfStream.addTrack(stream.getVideoTracks()[0]);
            myVideo.srcObject = selfStream;

            sendPC['seminar'] = createSenderPeerConnection(stream, 'seminar');
            let offer = await createSenderOffer(sendPC['seminar']);

            socket.emit("joinRoom", {
                senderSocketId: socket.id,
                roomId: roomId,
                purpose: 'seminar',
            });
            console.log("socket emit senderoffer")
            await socket.emit("senderOffer", {
                offer,
                senderSocketId: socket.id,
                roomId: roomId,
                userName: userName,
                purpose: 'seminar',
            });
        })
        .catch(error => {
            console.error(`getUserMedia error: ${error}`);
        		
            socket.emit("joinRoom", {
                senderSocketId: socket.id,
                roomId: roomId,
                purpose: 'seminar'
            });
		});
}

function createSenderPeerConnection(stream, purpose) {
    let pc = new RTCPeerConnection(pc_config);
    console.log("createSenderPeerConnection");
    pc.oniceconnectionstatechange = (e) => {
        //console.log(e);
    }

    pc.onicecandidate = (e) =>{
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

async function createSenderOffer(pc){
    console.log("createSenderOffer");
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

async function seminarAllUsersHandler(message) {
    try {
        let len = message.users.length;

        for(let i=0; i<len; i++) {
            var socketId = message.users[i].socket_id;
            var userName = message.users[i].user_name;
            var purpose = message.purpose;

            let pc = createReceiverPeerConnection(socketId, userName, purpose, ontrackHandler[purpose]);
            let offer = await createReceiverOffer(pc);
    
            receivePCs[purpose][socketId] = pc;
    
            await socket.emit("receiverOffer", {
                offer,
                receiverSocketId: socket.id,
                senderSocketId: socketId,
                purpose: purpose,
            });	
        }
    } catch(err) {
        console.error(err);
    }
}

function seminarOntrackHandler(stream, userName, senderSocketId) {
    if(receiveVideos[senderSocketId]) return;
    userStreams[senderSocketId] = stream;
    receiveVideos[senderSocketId] = setSeminarVideo(userName, false, userName === roomLeader);
    receiveVideos[senderSocketId].srcObject = stream;
    //console.log(stream);
}

//스트림 받는 역할의 peerConnection 객체 생성
function createReceiverPeerConnection(senderSocketId, userName, purpose, ontrackHandler) {
    let pc = new RTCPeerConnection(pc_config);
    console.log("createReceiverPeerConnection")
    pc.oniceconnectionstatechange = (e) =>{
        //console.log(e);
    }

    pc.onicecandidate = (e) => {
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
        ontrackHandler(e.streams[0], userName, senderSocketId);
    }
    return pc;
}

async function createReceiverOffer(pc) {
    console.log("createReceiverOffer")
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

async function seminarUserEnterHandler(message) {
    document.getElementsByClassName('c_r')[0].innerHTML = ++numOfUsers + '명';
    document.getElementById('num_user_span').innerHTML = numOfUsers + '명';
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

socket.on("roomInfo", (message) => {
    roomLeader = message.roomLeader;
    numOfUsers = message.numOfUsers;
    roomType = message.roomType;
    console.log("numOfUsers:",numOfUsers);
    document.getElementsByClassName('c_r')[0].innerHTML = numOfUsers + '명';
    document.getElementsByClassName('c_y')[0].innerHTML = roomLeader;
    document.getElementById('num_user_span').innerHTML = numOfUsers + '명';
    

    startFunction[roomType](userName, roomId, roomLeader); //seminarStart
});

socket.on("seminar_userEnter", async (message) => {
    console.log("새로운 유저");
    userEnterHandler[message.purpose](message);
});







//방에 접속한 user가 이미 방안에 들어와있던 user들의 정보를 받기 위한 이벤트
socket.on("allUsers", (message) => {
    //allUsersHandler[message.purpose](message);//seminarAllUsersHandler
    seminarAllUsersHandler(message);
});


//자신이 리더인지 나타내는 is_Leader를 설정해줌
socket.on("isLeader", (message) => {
    if(message.isLeader === undefined)
        is_Leader=true
    else
        is_Leader=false
});

//클라이언트 입장에서 받는 역할의 peerConnection 객체에서 수신한 answer 메시지
socket.on("getReceiverAnswer", (message) => {
    console.log("socket getReceiverAnswer");
    try {
        let pc = receivePCs[message.purpose][message.id];
        if(pc.signalingState === 'stable') return;
        pc.setRemoteDescription(new RTCSessionDescription(message.answer));
    } catch (error) {
        console.error(error);
    }
});

//서버입장에서 보내는 역할의 peerConnection 객체에서 수신한 candidate 메시지
socket.on("getSenderCandidate", (message) => {
    console.log("socket getSenderCandidate")
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
socket.on("getSenderAnswer", (message) => {
    console.log("socket getSenderAnswer")
    try {
        sendPC[message.purpose].setRemoteDescription(new RTCSessionDescription(message.answer));
    } catch (error) {
        console.error(error);
    }
});

//서버입장에서 받는 역할의 peerConnection 객체에서 수신한 candidate 메시지
socket.on("getReceiverCandidate", (message) => {
    console.log("socket getReceiverCandidate")
    try {
        let pc = receivePCs[message.purpose][message.id];
        if(!message.candidate) return;
        if(!pc) return;
        pc.addIceCandidate(new RTCIceCandidate(message.candidate));
    } catch (error) {
        console.log(error);
    }
});
















function show(){
    console.log("click")
    socket.emit("show");
}