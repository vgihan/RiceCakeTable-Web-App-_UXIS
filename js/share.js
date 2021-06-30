function shareRequest() {
    if(shareSwitch) return;
    socket.emit('share_question');
}

function shareStart() {
    navigator.mediaDevices.getDisplayMedia({
        audio:true,
        video:true
    }).then(async function(stream){ 
        shareSwitch = false;
        setShareView();

		$('.header .r_hcont .second .h_btn.p_people').removeClass('on').addClass('off');
		$('.header .r_hcont .second .h_btn.share').removeClass('off').addClass('on');

        document.getElementsByClassName('nicknm')[0].innerHTML = userName;


        document.getElementsByClassName('chat1_1_cc')[0].innerHTML = 
        `<p>PC 화면</p> 
        <p>공유 중</p>
        <p>입니다</p>
        <a href="#" onclick="shareDisconnect()">종료하기</a>`;

        document.getElementsByClassName('view_all')[0].style = 'display: block;';
        document.getElementsByClassName('view_lbox')[0].style = 'display: block;';
        document.getElementsByClassName('chat1_1_cc')[0].style = 'display: block;';
        document.getElementsByClassName('inner')[0].style = 'display: none;';

        var myStream = new MediaStream();
        myStream.addTrack(stream.getVideoTracks()[0]);

        document.getElementById('share_video').srcObject = myStream;
        document.getElementById('self_video').srcObject = selfStream;

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
    setAudienceShareView();

    document.getElementById('share_video').srcObject = stream;
    document.getElementById('self_video').srcObject = userStreams['meeting'][senderSocketId];
    document.getElementsByClassName('nicknm')[0].innerHTML = userName;

    document.getElementsByClassName('view_all')[0].style = "display: block;";
    document.getElementsByClassName('view_lbox')[0].style = "display: block;";
    document.getElementsByClassName('inner')[0].style = "display: none;";

	$('.header .r_hcont .second .h_btn.p_people').removeClass('on').addClass('off');
	$('.header .r_hcont .second .h_btn.share').removeClass('off').addClass('on');
}

async function shareRequestHandler(message) {
    receivePCs['share'][message.socketId] = createReceiverPeerConnection(message.socketId, message.userName, 'share', shareOntrackHandler);
    let offer = await createReceiverOffer(receivePCs['share'][message.socketId]);

    await socket.emit('receiver_offer', {
        offer,
        receiverSocketId: socket.id,
        senderSocketId: message.socketId,
        purpose: 'share',
    });
}

function shareDisconnect() {
    document.getElementById('share_video').srcObject = null;
    document.getElementById('self_video').srcObject = null;
    
    var cc = document.getElementsByClassName('chat1_1_cc')[0];
    cc.parentNode.removeChild(cc);

    document.getElementsByClassName('view_all')[0].style = "display: none;";
    document.getElementsByClassName('view_lbox')[0].style = "display: none;";
    document.getElementsByClassName('chat1_1_cc')[0].style = "display: none;";
    document.getElementsByClassName('inner')[0].style = "display: block;";

    $('.header .r_hcont .second .h_btn.p_people').removeClass('off').addClass('on');
	$('.header .r_hcont .second .h_btn.share').removeClass('on').addClass('off');

    socket.emit('share_disconnect');
    
    removeShareView();
    shareSwitch = true;
}

function responseShareDisconnect() {
    document.getElementById('share_video').srcObject = null;
    document.getElementById('self_view').srcObject = null;

    document.getElementsByClassName('view_all')[0].style = "display: none;";
    document.getElementsByClassName('view_lbox')[0].style = "display: none;";
    document.getElementsByClassName('chat1_1_cc')[0].style = "display: none;";
    document.getElementsByClassName('inner')[0].style = "display: block;";

    removeShareView();

    $('.header .r_hcont .second .h_btn.p_people').removeClass('off').addClass('on');
	$('.header .r_hcont .second .h_btn.share').removeClass('on').addClass('off');

    shareSwitch = true;
}

function setShareView() {
    var viewAllTag = `<div>
                        <video id='share_video' autoplay playsinline>
                      </div>`;
    var chat1_1_ccTag = `<p>PC 화면</p> 
                         <p>공유 중</p>
                         <p>입니다</p>
                         <a href="#" onclick="shareDisconnect()">종료하기</a>`;
    var view_lboxTag = `<div class="self_view">
                            <div>
                                <video id='self_video' autoplay playsinline></video>
                                <div class="info_ctxt">
                                    <div class="nicknm"></div>
                                </div>
                            </div>
                        </div>`;
    document.getElementsByClassName('view_all')[0].innerHTML = viewAllTag;
    document.getElementsByClassName('chat1_1_cc')[0].innerHTML = chat1_1_ccTag;
    document.getElementsByClassName('view_lbox')[0].innerHTML = view_lboxTag;    
}

function setAudienceShareView() {
    var viewAllTag = `<div>
                        <video id='share_video' autoplay playsinline>
                      </div>`;
    var view_lboxTag = `<div class="self_view">
                            <div>
                                <video id='self_video' autoplay playsinline></video>
                                <div class="info_ctxt">
                                    <div class="nicknm"></div>
                                </div>
                            </div>
                        </div>`;
    document.getElementsByClassName('view_all')[0].innerHTML = viewAllTag;
    document.getElementsByClassName('view_lbox')[0].innerHTML = view_lboxTag;
}

function removeShareView() {
    var view_all = document.getElementsByClassName('view_all')[0];
    while(view_all.hasChildNodes()) {
        view_all.removeChild(view_all.firstChild);
    }
    var chat1_1_cc = document.getElementsByClassName('chat1_1_cc')[0];
    while(chat1_1_cc.hasChildNodes()) {
        chat1_1_cc.removeChild(chat1_1_cc.firstChild);
    }
    var view_lbox = document.getElementsByClassName('view_lbox')[0];
    while(view_lbox.hasChildNodes()) {
        view_lbox.removeChild(view_lbox.firstChild);
    }
}