//let ontrackSwitch = false;

window.addEventListener("beforeunload", function(e){
    browserDisconnect()
    socket.emit("ex")
    return 0;

}); 


function shareRequest() {
socket.emit('share_question');

}

function shareStart() {
navigator.mediaDevices.getDisplayMedia({
    audio:true,
    video:true
}).then(async function(stream){ 
    console.log("stream check:",stream.getAudioTracks().length);//1이면 audio(o) 0이면 audio(x)
    var is_audio_true = stream.getAudioTracks().length

    shareSocketId = socket.id;
    setPresenterShareView();

    $('.header .r_hcont .second .h_btn.p_people').removeClass('on').addClass('off');
    $('.header .r_hcont .second .h_btn.share').removeClass('off').addClass('on');

    
    if(roomType == 'meeting'){
        //document.getElementsByClassName('nicknm')[0].innerHTML = userName;
        document.getElementsByClassName('inner')[0].style = 'display: none;';  //공유자의 기존화면 안보이게
    }
    if(roomType == 'seminar'){
        document.getElementsByClassName('view_all')[0].style = 'display: none;';
    }
    sendPC['share'] = createSenderPeerConnection(stream, 'share',is_audio_true);
    let offer = await createSenderOffer(sendPC['share']);

    await socket.emit('sender_offer', {
        offer,
        senderSocketId: socket.id,
        roomId: roomId,
        userName: userName,
        purpose: 'share',
    });
    shareSwitch=true;
}).catch(error => {
        console.log('error display stream',error);
});
}

function shareOntrackHandler(stream, userName, senderSocketId) {  //공유받는자의 화면 처리
    shareSwitch=true;
    if(roomType == 'meeting'){//미팅인 경우
        meeting_setAudienceShareView();
        document.getElementsByClassName('inner')[0].style = "display: none;";  //기존 화면 안보이게
        document.getElementById('share_video').srcObject = stream;     //share viedo에 stream넣기
        document.getElementById('self_video').srcObject = userStreams['meeting'][senderSocketId];
        document.getElementsByClassName('nicknm')[0].innerHTML = userName;   
    }
    if(roomType == 'seminar'){//세미나인 경우
        seminar_setAudienceShareView();
        document.getElementsByClassName('presenterVideo')[0].style = "display: none;";  //기존 화면 안보이게
        document.getElementById('share_video').srcObject = stream;       //share viedo에 stream넣기
        document.getElementById('self_video').srcObject = userStreams['seminar'][senderSocketId];
        var nicknm_len = document.getElementsByClassName('nicknm').length
        document.getElementsByClassName('nicknm')[nicknm_len-1].innerHTML = userName;   //share video이름 설정
        document.getElementsByClassName('list_slide')[0].style = "display: none;";
    }

    $('.header .r_hcont .second .h_btn.p_people').removeClass('on').addClass('off');
    $('.header .r_hcont .second .h_btn.share').removeClass('off').addClass('on');
    }

    async function shareRequestHandler(message) { //share요청 받기
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

async function shareUserHandler(message) {//방에 접속했는데 이미 화면공유중이면 이 핸들러동작
    try {
        var socketId = message.users[0].socket_id;  //현재 화면공유중인 socketId
        var userName = message.users[0].user_name;
        //현재 화면공유중인 화면에 대한 pc, offer처리
        receivePCs['share'][socketId] = createReceiverPeerConnection(socketId, userName, 'share', shareOntrackHandler);  
        let offer = await createReceiverOffer(receivePCs['share'][socketId]);

        await socket.emit("receiver_offer", {
            offer,
            receiverSocketId: socket.id,
            senderSocketId: socketId,
            purpose: 'share',
        });	
        
    } catch(err) {
        console.error(err);
    }
}

function shareDisconnect() {   //공유자의 화면설정
    console.log("종료하기 클릭됨");
    shareSwitch=false;
    removePresenterShareView();
    if(roomType == 'meeting'){//미팅인 경우
        document.getElementsByClassName('inner')[0].style = "display: block;"; //원래 비디오 보이게
    }
    if(roomType == 'seminar'){//세미나인 경우
        document.getElementsByClassName('view_all')[0].style = "display: block;"; //원래 비디오 보이게
        document.getElementsByClassName('list_slide')[0].style = "display: block;"; //참가자 보이게
    }
    $('.header .r_hcont .second .h_btn.p_people').removeClass('off').addClass('on');
    $('.header .r_hcont .second .h_btn.share').removeClass('on').addClass('off');

    receivePCs['share']={};
    socket.emit('share_disconnect');

}

function responseShareDisconnect() {  //공유 받는자의 화면설정
    shareSwitch=false;
    document.getElementById('share_video').srcObject = null;  
    document.getElementsByClassName('self_view').srcObject = null;    


    removeAudienceShareView();
    if(roomType == 'meeting'){
        document.getElementsByClassName('inner')[0].style = "display: block;"; //원래 비디오 보이게
    }
    if(roomType == 'seminar'){
        var view_all= document.getElementsByClassName('view_all')[0]
        view_all.removeChild(view_all.childNodes[0]);  //shareview 삭제
        document.getElementsByClassName('presenterVideo')[0].style = "display: block;"; //원래 비디오 보이게
        document.getElementsByClassName('list_slide')[0].style = "display: block;"; //참가자 보이게
    }
    $('.header .r_hcont .second .h_btn.p_people').removeClass('off').addClass('on');
    $('.header .r_hcont .second .h_btn.share').removeClass('on').addClass('off');
    receivePCs['share']={};
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

    a.setAttribute("onClick", "shareDisconnect()");  //클릭시 종료하도록
    a.innerHTML = '종료하기';

    chat1_1_cc.appendChild(p1);
    chat1_1_cc.appendChild(p2);
    chat1_1_cc.appendChild(p3);
    chat1_1_cc.appendChild(a);

    var container = document.getElementsByClassName('cont')[0];
    if(roomType=='meeting')
        container.insertBefore(chat1_1_cc, document.getElementsByClassName('inner')[0]);
    if(roomType=='seminar')
        container.insertBefore(chat1_1_cc, document.getElementsByClassName('view_all')[0]);

}

function meeting_setAudienceShareView() {
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

function seminar_setAudienceShareView() {
    //var view_all = document.createElement('div');
    var view_all = document.getElementsByClassName('view_all')[0];

    var div_va = document.createElement('div');
    var share_video = document.createElement('video');
    var view_lbox = document.createElement('div');
    var self_view = document.createElement('div');
    var div_sv = document.createElement('div');
    var self_video = document.createElement('video');
    var info_ctxt = document.createElement('div');
    var nicknm = document.createElement("div");

    //view_all.className = 'view_all';
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

    //view_all.appendChild(div_va);
    view_all.insertBefore(div_va,view_all.childNodes[0]);
    div_va.appendChild(share_video);
    view_lbox.appendChild(self_view);
    self_view.appendChild(div_sv);
    div_sv.appendChild(self_video);
    div_sv.appendChild(info_ctxt);
    info_ctxt.appendChild(nicknm);

    var container = document.getElementsByClassName('cont')[0];

    container.appendChild(view_lbox);
    //container.insertBefore(view_all, document.getElementsByClassName('view_lbox')[0]);
}

function removePresenterShareView() {
    var chat1_1_cc = document.getElementsByClassName('chat1_1_cc')[0]; //화면공유중단 버튼 없애기
    chat1_1_cc.parentNode.removeChild(chat1_1_cc);   

}

function removeAudienceShareView() {

    var cont = document.getElementsByClassName('cont')[0];
    if(roomType == 'meeting'){ //미팅인 경우
        var view_all = document.getElementsByClassName('view_all')[0];
        cont.removeChild(view_all);
    }
    var view_lbox = document.getElementsByClassName('view_lbox')[0];
    cont.removeChild(view_lbox);
}



