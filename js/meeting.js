let ontrackHandler = meetingOntrackHandler;
let allUsersHandler = meetingAllUsersHandler;
let userEnterHandler = meetingUserEnterHandler;
let userExitHandler = meetingUserExitHandler;
let startFunction = meetingStart;

/*
document.getElementsByClassName('refusal')[0].onclick = (e) => {
    document.getElementsByClassName('chat_accept')[0].style = 'display: none;';
};
document.getElementsByClassName('accept')[0].onclick = (e) => {
    document.getElementsByClassName('chat_accept')[0].style = 'display: none;';
};
*/

// user의 카메라와 마이크에 접근하여 스트림 받은 뒤 peerconnection 객체 생성하고 offer전송(통신 시작)
function meetingStart(userName, roomId, roomLeader){
    navigator.mediaDevices
        .getUserMedia({
            audio: true,
            video: true,
        })
        .then(async stream => {
            const myVideo = setMeetingVideo(userName, true, socket.id === roomLeader, socket.id);
            selfStream = new MediaStream();
            selfStream.addTrack(stream.getVideoTracks()[0]);
            myVideo.srcObject = selfStream;

            userStreams['meeting']['myId'] = selfStream;
            receiveVideos['meeting']['myId'] = myVideo
            receiveVideos['meeting']['myId'].srcObject = selfStream;

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
function setMeetingVideo(userName, isLocal, isLeader, socketId){
    var video = document.createElement('video');
    //video.className = 'video_' + userName;
    video.className = 'video_' + socketId;
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
    //a.id = userName;
    a.id = socketId;
    chat_1_1.className = "chat_1_1";
    nicknm.className = "nicknm";
    info_ctxt.className = "info_ctxt";
    v_view.className = "v_view";
    //li.className = userName;
    li.className = socketId;
    li.id

    nicknm.innerHTML = userName;

    var container = document.getElementsByClassName('slick-slide slick-current slick-active')[0];
    div.appendChild(a);
    chat_1_1.appendChild(div);
    info_ctxt.appendChild(nicknm);
    v_view.appendChild(video);
    v_view.appendChild(info_ctxt);
    li.appendChild(v_view);
    container.appendChild(li);

    if(!isLocal) v_view.appendChild(chat_1_1); //자신의 비디오가 아닌경우 1대1요청 뜨게
    if(isLeader) {  //방장인 경우 M마크 뜨게
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

//비디오를 6명씩 잘라서 넣음
function setNewMeetingVideo(userName, isLocal, isLeader, socketId){
    var video = document.createElement('video');
    //video.className = 'video_' + userName;
    video.className = 'video_' + socketId;
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
    //a.id = userName;
    a.id = socketId;
    chat_1_1.className = "chat_1_1";
    nicknm.className = "nicknm";
    info_ctxt.className = "info_ctxt";
    v_view.className = "v_view";
    //li.className = userName;
    li.className = socketId;
    li.id

    var ul_num=document.getElementsByClassName('slick-track')[0].childElementCount;
    var li_num=document.getElementsByClassName('slick-slide')[ul_num-1].childElementCount;
    console.log("ul_num:",ul_num)
    console.log("li_num:",li_num)

    nicknm.innerHTML = userName;
    if(li_num !== 6)
        var container = document.getElementsByClassName('slick-slide')[ul_num-1];
    else{
        var container=document.createElement("ul");
        //container.className="slick-slide";
        //container.setAttribute("data-slick-index",ul_num);
        //container.setAttribute("tabindex",-1);
        //container.setAttribute("role","tabpanel");
        //container.id=`slick-slide0${ul_num}`;
        //container.setAttribute("aria-describedby",`slick-slide-control0${ul_num}`);
        document.getElementsByClassName('slick-track')[0].appendChild(container);
        /*
        var dot_ul = document.getElementsByClassName('slick-dots')[0];
        var dot_li = document.createElement("li");
        dot_li.className="";
        dot_li.setAttribute("role","presentation");
        var dot_btn = document.createElement("button");
        dot_li.appendChild(dot_btn);
        dot_btn.setAttribute("type","button");
        dot_btn.setAttribute("role","tab");
        dot_btn.setAttribute("aria-controls",`slick-slide0${ul_num}`);
        dot_btn.id=`slick-slide-contorl0${ul_num}`;
        dot_btn.setAttribute("aria-seleced","false");
        dot_btn.setAttribute("aria-label",`${ul_num+1} of ${ul_num+1}`);
        dot_btn.setAttribute("tabindex","-1");
        dot_btn.innerHTML=`${ul_num+1}`;
        //dot_li.appendChild(dot_btn);
        dot_ul.appendChild(dot_li)
        */
    }
        
    div.appendChild(a);
    chat_1_1.appendChild(div);
    info_ctxt.appendChild(nicknm);
    v_view.appendChild(video);
    v_view.appendChild(info_ctxt);
    li.appendChild(v_view);
    container.appendChild(li);

    if(!isLocal) v_view.appendChild(chat_1_1); //자신의 비디오가 아닌경우 1대1요청 뜨게
    if(isLeader) {  //방장인 경우 M마크 뜨게
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
    receiveVideos['meeting'][senderSocketId] = setMeetingVideo(userName, false, senderSocketId === roomLeader, senderSocketId);
    receiveVideos['meeting'][senderSocketId].srcObject = stream;
    //console.log(stream);
}

async function meetingAllUsersHandler(message) {   //자신을 제외한 모든 유저의 receiverPc생성, 비디오 생성(처음 접속했을 때 한번만)
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

async function meetingUserEnterHandler(message) {   //누군가 들어왔을 때
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

function meetingUserExitHandler(message) {  //누군가 나갔을 때
    let socketId = message.id;
    let userName = message.userName;

    console.log(socketId);
    console.log(roomLeader);

    if(socketId === roomLeader) document.getElementById('disconnect').click();

    document.getElementsByClassName('c_r')[0].innerHTML = --numOfUsers + '명';
    document.getElementById('num_user_span').innerHTML = numOfUsers + '명';

    receivePCs[message.purpose][socketId].close();
    delete receivePCs[message.purpose][socketId];
    delete userStreams[message.purpose][socketId];
    delete receiveVideos[message.purpose][socketId];
    

    //var exitUserElement = document.getElementsByClassName(userName)[0];
    var exitUserElement = document.getElementsByClassName(socketId)[0];
    exitUserElement.parentNode.removeChild(exitUserElement);
}