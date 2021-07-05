let ontrackHandler = meetingOntrackHandler;
let allUsersHandler = meetingAllUsersHandler;
let userEnterHandler = meetingUserEnterHandler;
let userExitHandler = meetingUserExitHandler;
let startFunction = meetingStart;

document.getElementsByClassName('refusal')[0].onclick = (e) => {
    document.getElementsByClassName('chat_accept')[0].style = 'display: none;';
};

// user의 카메라와 마이크에 접근하여 스트림 받은 뒤 peerconnection 객체 생성하고 offer전송(통신 시작)
function meetingStart(userName, roomId, roomLeader){
    navigator.mediaDevices
        .getUserMedia({
            audio: true,
            video: true,
        })
        .then(async stream => {
            const myVideo = setMeetingVideo(userName, true, socket.id === roomLeader);
            selfStream = new MediaStream();
            selfStream.addTrack(stream.getVideoTracks()[0]);
            myVideo.srcObject = selfStream;

            sendPC['meeting'] = createSenderPeerConnection(stream, 'meeting');
            let offer = await createSenderOffer(sendPC['meeting']);

            socket.emit("join_room", {
                senderSocketId: socket.id,
                roomId: roomId,
                userName: userName,
                purpose: 'meeting',
            });

            await socket.emit("sender_offer", {
                offer,
                senderSocketId: socket.id,
                roomId: roomId,
                userName: userName,
                purpose: 'meeting',
            });
        })
        .catch(error => {
            console.error(error);
        		
            socket.emit("join_room", {
                senderSocketId: socket.id,
                roomId: roomId,
            });
		});
}

// view에서 비디오 자리 세팅
function setMeetingVideo(userName, isLocal, isLeader){
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
    li.appendChild(v_view);
    container.appendChild(li);

    if(!isLocal) v_view.appendChild(chat_1_1);
    if(isLeader) {
        var info_ctxt02 = document.createElement('div');
        var label = document.createElement('div');
        info_ctxt02.className = 'info_ctxt02';
        label.className = 'label';
        label.innerHTML = 'M';
        info_ctxt02.appendChild(label);
        v_view.appendChild(info_ctxt02);
    }

    return video;
}

function meetingOntrackHandler(stream, userName, senderSocketId) {
    if(receiveVideos['meeting'][senderSocketId]) return;
    userStreams['meeting'][senderSocketId] = stream;
    receiveVideos['meeting'][senderSocketId] = setMeetingVideo(userName, false, senderSocketId === roomLeader);
    receiveVideos['meeting'][senderSocketId].srcObject = stream;
    console.log(stream);
}

async function meetingAllUsersHandler(message) {
    try {
        let len = message.users.length;

        for(let i=0; i<len; i++) {
            var socketId = message.users[i].socket_id;
            var userName = message.users[i].user_name;

            let pc = createReceiverPeerConnection(socketId, userName, 'meeting', ontrackHandler);
            let offer = await createReceiverOffer(pc);
    
            receivePCs['meeting'][socketId] = pc;
    
            await socket.emit("receiver_offer", {
                offer,
                receiverSocketId: socket.id,
                senderSocketId: socketId,
                purpose: 'meeting',
            });	
        }
    } catch(err) {
        console.error(err);
    }
}

async function meetingUserEnterHandler(message) {
    try {
        let pc = createReceiverPeerConnection(message.socketId, message.userName, 'meeting', meetingOntrackHandler);
        let offer = await createReceiverOffer(pc);
        
        receivePCs['meeting'][message.socketId] = pc;

        await socket.emit("receiver_offer", {
            offer,
            receiverSocketId: socket.id,
            senderSocketId: message.socketId,
            purpose: 'meeting',
        });

        document.getElementsByClassName('c_r')[0].innerHTML = ++numOfUsers + '명';
        document.getElementById('num_user_span').innerHTML = numOfUsers + '명';
    } catch (error) {
        console.error(error);
    }
}

function meetingUserExitHandler(message) {
    let socketId = message.id;
    let userName = message.userName;

    console.log(socketId);
    console.log(roomLeader);

    if(socketId === roomLeader) document.getElementById('disconnect').click();

    document.getElementsByClassName('c_r')[0].innerHTML = --numOfUsers + '명';
    document.getElementById('num_user_span').innerHTML = numOfUsers + '명';

    receivePCs[message.purpose][socketId].close();
    delete receivePCs[message.purpose][socketId];
    
    var exitUserElement = document.getElementsByClassName(userName)[0];
    exitUserElement.parentNode.removeChild(exitUserElement);
}