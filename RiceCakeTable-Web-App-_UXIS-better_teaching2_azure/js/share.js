let ontrackSwitch = false;

function shareRequest() {
    if(shareSwitch) return;
    socket.emit('share_question');
}

function shareStart() {
    navigator.mediaDevices.getDisplayMedia({
        audio:true,
        video:true
    }).then(async function(stream){ 
        shareSwitch = true;
        shareSocketId = socket.id;
        setPresenterShareView();

		$('.header .r_hcont .second .h_btn.p_people').removeClass('on').addClass('off');
		$('.header .r_hcont .second .h_btn.share').removeClass('off').addClass('on');

        document.getElementsByClassName('nicknm')[0].innerHTML = userName;
        document.getElementsByClassName('inner')[0].style = 'display: none;';

        sendPC['share'] = createSenderPeerConnection(stream, 'share');
        let offer = await createSenderOffer(sendPC['share']);

        await socket.emit('sender_offer', {
            offer,
            senderSocketId: socket.id,
            roomId: roomId,
            userName: userName,
            purpose: 'share',
        });
    }).catch(error => {
            console.log('error display stream',error);
    });
}

function shareOntrackHandler(stream, userName, senderSocketId) {
    if(ontrackSwitch) {
        ontrackSwitch = false;
        return;
    }
    ontrackSwitch = true;
    setAudienceShareView();
    shareSwitch = true;
	document.getElementsByClassName('inner')[0].style = "display: none;";

    document.getElementById('share_video').srcObject = stream;
    document.getElementById('self_video').srcObject = userStreams['meeting'][senderSocketId];
    document.getElementsByClassName('nicknm')[0].innerHTML = userName;

	$('.header .r_hcont .second .h_btn.p_people').removeClass('on').addClass('off');
	$('.header .r_hcont .second .h_btn.share').removeClass('off').addClass('on');
}

async function shareRequestHandler(message) {
    receivePCs['share'][message.socketId] = createReceiverPeerConnection(message.socketId, message.userName, 'share', shareOntrackHandler);
    let offer = await createReceiverOffer(receivePCs['share'][message.socketId]);

    shareSocketId = message.socketId;

    await socket.emit('receiver_offer', {
        offer,
        receiverSocketId: socket.id,
        senderSocketId: message.socketId,
        purpose: 'share',
    });
}

function shareDisconnect() {
    removePresenterShareView();

    document.getElementsByClassName('inner')[0].style = "display: block;";

    $('.header .r_hcont .second .h_btn.p_people').removeClass('off').addClass('on');
	$('.header .r_hcont .second .h_btn.share').removeClass('on').addClass('off');

    socket.emit('share_disconnect');
    shareSwitch = false;
}

function responseShareDisconnect() {
    document.getElementById('share_video').srcObject = null;
    document.getElementById('self_view').srcObject = null;

	console.log("share disconnect response");

    removeAudienceShareView();

    $('.header .r_hcont .second .h_btn.p_people').removeClass('off').addClass('on');
	$('.header .r_hcont .second .h_btn.share').removeClass('on').addClass('off');

    shareSwitch = false;
}

function setPresenterShareView() {
    var chat1_1_cc = document.createElement('div');
    var p1 = document.createElement('p');
    var p2 = document.createElement('p');
    var p3 = document.createElement('p');
    var a = document.createElement('a');  
    
    chat1_1_cc.className = 'chat1_1_cc';
    p1.innerHTML = 'PC 화면';
    p2.innerHTML = '공유 중';
    p3.innerHTML = '입니다';
    a.href = "#";
    a.onclick = shareDisconnect;
    a.innerHTML = '종료하기';

    chat1_1_cc.appendChild(p1);
    chat1_1_cc.appendChild(p2);
    chat1_1_cc.appendChild(p3);
    chat1_1_cc.appendChild(a);

    
    var container = document.getElementsByClassName('cont')[0];
    container.insertBefore(chat1_1_cc, document.getElementsByClassName('inner')[0]);
}

function setAudienceShareView() {
    var view_all = document.createElement('div');
    var div_va = document.createElement('div');
    var share_video = document.createElement('video');
    var view_lbox = document.createElement('div');
    var self_view = document.createElement('div');
    var div_sv = document.createElement('div');
    var self_video = document.createElement('video');
    var info_ctxt = document.createElement('div');
    var nicknm = document.createElement("div");

    view_all.className = 'view_all';
    share_video.id = 'share_video';
    share_video.autoplay = true;
    share_video.playsInline = true;
    view_lbox.className = 'view_lbox';
    self_view.className = 'self_view';
    self_video.id = 'self_video';
    self_video.autoplay = true;
    self_video.playsInline = true;
    info_ctxt.className = 'info_ctxt';
    nicknm.className = 'nicknm';

    view_all.appendChild(div_va);
    div_va.appendChild(share_video);
    view_lbox.appendChild(self_view);
    self_view.appendChild(div_sv);
    div_sv.appendChild(self_video);
    div_sv.appendChild(info_ctxt);
    info_ctxt.appendChild(nicknm);

    var container = document.getElementsByClassName('cont')[0];

    container.insertBefore(view_lbox, document.getElementsByClassName('inner')[0]);
    container.insertBefore(view_all, document.getElementsByClassName('view_lbox')[0]);
}

function removePresenterShareView() {
    var view_all = document.getElementsByClassName('view_all')[0];
    view_all.parentNode.removeChild(view_all);
    var chat1_1_cc = document.getElementsByClassName('chat1_1_cc')[0];
    chat1_1_cc.parentNode.removeChild(chat1_1_cc);
    var view_lbox = document.getElementsByClassName('view_lbox')[0];
    view_lbox.parentNode.removeChild(view_lbox);
}

function removeAudienceShareView() {
    var view_all = document.getElementsByClassName('view_all')[0];
    view_all.parentNode.removeChild(view_all);
    var view_lbox = document.getElementsByClassName('view_lbox')[0];
    view_lbox.parentNode.removeChild(view_lbox);
}
