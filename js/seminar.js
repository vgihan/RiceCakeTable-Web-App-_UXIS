let ontrackHandler = seminarOntrackHandler;
let allUsersHandler = seminarAllUsersHandler;
let userEnterHandler = seminarUserEnterHandler;
let userExitHandler = seminarUserExitHandler;
let startFunction = seminarStart;

function browserDisconnect() {
    socket.emit("seminar_disconnect");
}

function seminarStart(userName, roomId, leader) {
    roomLeader = leader;
    console.log(leader);
    console.log(socket.id);
    if(leader !== socket.id) {
        audienceStart(userName, roomId, leader);
        document.getElementsByClassName('cc_btn')[1].style = 'display: none;';   //화면 공유 버튼 없애기
        //document.getElementsByClassName('h_btn share on')[0].style = 'display: none;';
        document.getElementsByClassName('h_btn')[0].setAttribute("onclick","");

        
        return;
    }
    presenterStart(userName, roomId);
}

function presenterStart(userName, roomId) {
    navigator.mediaDevices
        .getUserMedia({
            audio: true,
            video: true,
        })
        .then(async stream => {
            const myVideo = setSeminarVideo(userName, true, true);
            selfStream = new MediaStream();
            selfStream.addTrack(stream.getVideoTracks()[0]);
            myVideo.srcObject = selfStream;

            sendPC['seminar'] = createSenderPeerConnection(stream, 'seminar');
            let offer = await createSenderOffer(sendPC['seminar']);

            socket.emit("join_room", {
                senderSocketId: socket.id,
                roomId: roomId,
                userName: userName,
                purpose: 'seminar',
            });
            console.log("socket emit senderoffer")
            await socket.emit("sender_offer", {
                offer,
                senderSocketId: socket.id,
                roomId: roomId,
                userName: userName,
                purpose: 'seminar',
            });
        })
        .catch(error => {
            console.error(`getUserMedia error: ${error}`);
        		
            socket.emit("join_room", {
                senderSocketId: socket.id,
                roomId: roomId,
                userName: userName,
                purpose: 'seminar'
            });
		});
}

async function audienceStart(userName, roomId, roomLeader) {
    insertAudienceBox(userName, socket.id);
    
    socket.emit('join_room', {
        senderSocketId: socket.id,
        roomId: roomId,
        userName: userName,
        purpose: 'seminar',
    });
}

function setSeminarVideo() {
    var container = document.getElementsByClassName('view_all')[0];
    var div = document.createElement('div');
    var video = document.createElement('video');

    container.appendChild(div);
    div.appendChild(video);

    video.className = 'presenterVideo';
    video.autoplay = true;
    video.playsInline = true;

    return video;
}

function seminarOntrackHandler(stream, userName, senderSocketId) {
    if(receiveVideos['seminar'][senderSocketId]) return;
    console.log(stream);
    userStreams['seminar'][senderSocketId] = stream;
    receiveVideos['seminar'][senderSocketId] = setSeminarVideo();
    receiveVideos['seminar'][senderSocketId].srcObject = stream;
}

async function seminarAllUsersHandler(message) {
    try {
        let len = message.users.length;

        for(let i=0; i<len; i++) {
            var socketId = message.users[i].socket_id;
            var userName = message.users[i].user_name;

            if(socketId !== roomLeader) {
                insertAudienceBox(userName, socketId);
                return;
            }

            receivePCs['seminar'][socketId] = createReceiverPeerConnection(socketId, userName, 'seminar', ontrackHandler);
            let offer = await createReceiverOffer(receivePCs['seminar'][socketId]);
    
            await socket.emit("receiver_offer", {
                offer,
                receiverSocketId: socket.id,
                senderSocketId: socketId,
                purpose: 'seminar',
            });	
        }
    } catch(err) {
        console.error(err);
    }
}

async function seminarUserEnterHandler(message) {
    document.getElementsByClassName('c_r')[0].innerHTML = ++numOfUsers + '명';
    document.getElementById('num_user_span').innerHTML = numOfUsers + '명';
    insertAudienceBox(message.userName, message.socketId);
}

function seminarUserExitHandler(message) {
    if(message.socketId !== roomLeader) {
        document.getElementsByClassName('c_r')[0].innerHTML = --numOfUsers + '명';
        document.getElementById('num_user_span').innerHTML = numOfUsers + '명';

        var userBox = document.getElementsByClassName(message.socketId)[0];
        userBox.parentNode.removeChild(userBox);
        return;
    }
    document.getElementById('disconnect').click();
}

function insertAudienceBox(userName, socketId) {
    let nicknm = document.createElement('div');
    let info_ctxt = document.createElement('div');
    let v_view = document.createElement('div');
    let li = document.createElement('li');

    nicknm.className = "nicknm";
    info_ctxt.className = "info_ctxt";
    v_view.className = "v_view";
    li.className = socketId;
    
    li.appendChild(v_view);
    v_view.appendChild(info_ctxt);
    info_ctxt.appendChild(nicknm);
    nicknm.innerHTML = userName;

    document.getElementsByClassName('slick-slide slick-current slick-active')[0].appendChild(li);
}

//no back
history.pushState(null,null,location.href);
window.onpopstate = function(event) {
    console.log("No Back");
    history.go(1);
}
