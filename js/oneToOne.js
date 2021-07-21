let targetId = null;
let targetName = null;

//let talking_stream = {};
let mute_list = [];

// 1:1 대화하기 버튼 누르면
function request_1_1(e) {
    if(document.getElementById(e.target.id).innerHTML == "1 : 1 대화신청"){
        document.getElementById(e.target.id).setAttribute('style', 'background:#fff;');
        socket.emit("request_1_1", {
            socketId: socket.id,
            target: e.target.id,
            userName: userName,
            roomId: roomId,
            text: document.getElementById(e.target.id).innerHTML
        });
        document.getElementById(e.target.id).innerHTML = "1 : 1 대화신청 중";
    }
}

// 1:1 대화하기 수락-거절 창 뜬다
function get11Request(message) {
    document.getElementsByClassName('c_y')[1].innerHTML = message.userName;
    document.getElementsByClassName('chat_accept')[0].setAttribute('style', 'display:block;');
    targetId = message.userId;
    targetName = message.userName;
}

// 수락 누름
function accept_1_1() {
    document.getElementsByClassName('chat_accept')[0].setAttribute('style', 'display: none;');
    socket.emit("accept_1_1",{
        socketId: socket.id,
        target: targetId,
        userName: userName,
        roomId: roomId
    });
    set11(targetId,targetName);
}

// 거절 누름
function refusal_1_1() {
    document.getElementsByClassName('chat_accept')[0].setAttribute('style', 'display: none;');
    socket.emit("refusal_1_1",{
        socketId: socket.id,
        target: targetId,
        userName: userName,
        roomId: roomId
    });
    targetId = null;
    targetName = null;
}

// 수락 받음
function get11Accept(message) {
    targetId = message.userId;
    targetName = message.userName;
    set11(targetId,targetName);
    
    document.getElementById(message.userId).setAttribute('style', 'background:#ffcc00;');
    document.getElementById(targetId).innerHTML = "1 : 1 대화신청"
}

// 거절 받음
function get11Refusal(message) {
    document.getElementsByClassName('c_y')[2].innerHTML = message.userName;
    document.getElementsByClassName('chat_accept')[1].setAttribute('style', 'display:block;');
    
    document.getElementById(message.userId).setAttribute('style', 'background:#ffcc00;');
    document.getElementById(message.userId).innerHTML = "1 : 1 대화신청"
}
function okay_1_1() {
    document.getElementsByClassName('chat_accept')[1].setAttribute('style', 'display: none;');
}

// 1:1 세팅
function set11(id,name){
    document.getElementsByClassName('inner')[0].setAttribute('style', 'display:none;');
    document.getElementsByClassName('conversation')[0].setAttribute('style', 'display:block;');
    
    document.getElementsByClassName('cc_btn')[1].setAttribute('style', 'display:none;'); //공유버튼 안 보이게
    document.getElementsByClassName('h_btn')[0].setAttribute('onclick','disableShare()');

    document.getElementById('target_video').srcObject = userStreams['meeting'][id];
    document.getElementById('my_video').srcObject = selfStream;

    socket.emit('mute_list', {
        socketId: socket.id,
        target: targetId,
        roomId: roomId
    });
    
    // userStreams['meeting'][id].getAudioTracks()[0].enabled=false; //지워야 댐
    console.log('mute_list',mute_list);
    
    oneoneUserId1 = socket.id;
    oneoneUserId2 = targetId;

}

// 1:1 종료
function end_1_1() {
    socket.emit("end_1_1",{
        socketId: socket.id,
        target: targetId,
        roomId: roomId
    });

    get11End();
}

function get11End() {
    if(document.getElementById('mute').innerHTML == "소리끄기") document.getElementById('mute').innerHTML = "소리켜기";
    unmute();
    if(targetId == roomLeader) {
    	receiveVideos['meeting'][targetId].srcObject = userStreams['meeting'][targetId];
    	document.getElementById(targetId).innerHTML = "1 : 1 대화신청";
    	document.getElementById(targetId).setAttribute('style','background:#ffcc00;');
    }

    document.getElementById('target_video').srcObject = null;
    document.getElementById('my_video').srcObject = null;

    document.getElementsByClassName('cc_btn')[1].setAttribute('style', 'display:block;'); //공유버튼 보이게
    document.getElementsByClassName('h_btn')[0].setAttribute('onclick','shareRequest()');

    document.getElementsByClassName('conversation')[0].setAttribute('style', 'display:none;');
    document.getElementsByClassName('inner')[0].setAttribute('style', 'display:block;');

    targetId=null;
    targetName=null;
    mute_list=[];
    
    oneoneUserId1 = null;
    oneoneUserId2 = null;
}

// 수락 받았을 때 나머지 사람들
function setOther(message) {
    receiveVideos['meeting'][message.user1Id].srcObject = null;
    receiveVideos['meeting'][message.user2Id].srcObject = null;
    // document.getElementById(message.user1Id).innerHTML = "1 : 1 대화 중";
    // document.getElementById(message.user1Id).setAttribute('style', 'background:#8f8f8f;');
    // document.getElementById(message.user2Id).innerHTML = "1 : 1 대화 중";
    // document.getElementById(message.user2Id).setAttribute('style', 'background:#8f8f8f;');
    if(message.user1Id == roomLeader) {
        document.getElementById(message.user1Id).innerHTML = "1 : 1 대화 중";
        document.getElementById(message.user1Id).setAttribute('style', 'background:#8f8f8f;');
    }
    else{
        makeChat_1_1(message.user1Id);
    }
    if(message.user2Id == roomLeader) {
        document.getElementById(message.user2Id).innerHTML = "1 : 1 대화 중";
        document.getElementById(message.user2Id).setAttribute('style', 'background:#8f8f8f;');
    }
    else{
        makeChat_1_1(message.user2Id);
    }
    document.getElementsByClassName('cc_btn')[1].setAttribute('style', 'display:none;'); //공유버튼 안보이게
    document.getElementsByClassName('h_btn')[0].setAttribute('onclick','disableShare()');

    oneoneUserId1 = message.user1Id;
    oneoneUserId2 = message.user2Id;
}

// 대화/요청받음 끝났을 때 나머지 사람들
function endOther(message) {
    receiveVideos['meeting'][message.user1Id].srcObject = userStreams['meeting'][message.user1Id];
    receiveVideos['meeting'][message.user2Id].srcObject = userStreams['meeting'][message.user2Id];
    // document.getElementById(message.user1Id).innerHTML = "1 : 1 대화신청";
    // document.getElementById(message.user1Id).setAttribute('style', 'background:#ffcc00;');
    // document.getElementById(message.user2Id).innerHTML = "1 : 1 대화신청";
    // document.getElementById(message.user2Id).setAttribute('style', 'background:#ffcc00;');
    if(message.user1Id == roomLeader) {
        document.getElementById(message.user1Id).innerHTML = "1 : 1 대화신청";
        document.getElementById(message.user1Id).setAttribute('style', 'background:#ffcc00;');
    }
    else{
        deleteChat_1_1(message.user1Id);
    }
    if(message.user2Id == roomLeader) {
        document.getElementById(message.user2Id).innerHTML = "1 : 1 대화신청";
        document.getElementById(message.user2Id).setAttribute('style', 'background:#ffcc00;');
    }
    else{
        deleteChat_1_1(message.user2Id);
    }
    document.getElementsByClassName('cc_btn')[1].setAttribute('style', 'display:block;'); //공유버튼 보이게
    document.getElementsByClassName('h_btn')[0].setAttribute('onclick','shareRequest()');

    //11conversation
    oneoneUserId1 = null;
    oneoneUserId2 = null;
}

// 요청 받았을 때 나머지 사람들
function ingOther(message) {
    // document.getElementById(message.user1Id).innerHTML = "1 : 1 요청 중";
    // document.getElementById(message.user2Id).innerHTML = "1 : 1 요청받음";
    if(message.user1Id == roomLeader) {
        document.getElementById(message.user1Id).innerHTML = "1 : 1 요청 중";
        document.getElementById(message.user1Id).setAttribute('style', 'background:#8f8f8f;');
    }
    if(message.user2Id == roomLeader) {
        document.getElementById(message.user2Id).innerHTML = "1 : 1 요청받음";
        document.getElementById(message.user2Id).setAttribute('style', 'background:#8f8f8f;');
    }
}

// mute 해야 할 사람 저장
function get11MuteList(message) {
    for(var i=0; i < message.others.length; i++) {
        mute_list.push(message.others[i]);
    }
    mute();
}

// 소리 버튼 누르면
function mute_1_1() {
    if (document.getElementById('mute').innerHTML == "소리켜기") {
        document.getElementById('mute').innerHTML = "소리끄기"
        unmute();
    }
    else if (document.getElementById('mute').innerHTML == "소리끄기") {
        document.getElementById('mute').innerHTML = "소리켜기"
        mute();
    }
}

function unmute() {
    for(var i=0; i < mute_list.length; i++) {
        key = mute_list[i];
        try{userStreams['meeting'][key].getAudioTracks()[0].enabled=true;}catch(e){console.error(e);}
    }
}

function mute() {
    for(var i=0; i < mute_list.length; i++) {
        key = mute_list[i];
        try{userStreams['meeting'][key].getAudioTracks()[0].enabled=false;}catch(e){console.error(e);}
    }
}

function check_exit_1_1(socketId) { // 내가 1:1 하던 중, 누군가 나갔을 때
    if(mute_list.length!==0)
    {
        if(socketId==targetId) get11End();
        else {
            var temp_list = [];
            for(var i=0; i < mute_list.length; i++) {
                if(socketId !== mute_list[i]) temp_list.push(mute_list[i]);
            }
            mute_list = temp_list;
        }
    }
    console.log(socketId,"exit : ",mute_list);
}

function check_enter_1_1(socketId) { // 내가 1:1 하던 중, 누군가 들어왔을 때
    if(targetId!==null) {
        mute_list.push(socketId); 
    }
    console.log(socketId,"enter : ",mute_list);
}

function setOther_come(id) {
    receiveVideos['meeting'][id].srcObject = null;
    if(id == roomLeader) {
        document.getElementById(id).innerHTML = "1 : 1 대화 중";
        document.getElementById(id).setAttribute('style', 'background:#8f8f8f;');
    }
    else {
        makeChat_1_1(id);
    }
    document.getElementsByClassName('cc_btn')[1].setAttribute('style', 'display:none;'); //공유버튼 안보이게
    document.getElementsByClassName('h_btn')[0].setAttribute('onclick','disableShare()');
}

function disableShare(){
    alert('1대1 대화중에는 화면공유가 불가능합니다.');
}

function makeChat_1_1(id){
    var chat= document.createElement('div');
    chat.className='chat_1_1';
    var chat_div= document.createElement('div');
    var chat_a= document.createElement('a');
    chat_a.setAttribute('tabindex','0');
    chat_a.setAttribute('id',id);
    chat_a.innerHTML='1 : 1 대화 중';
    chat_a.style="background:#8f8f8f";
    
    chat_div.appendChild(chat_a);
    chat.appendChild(chat_div);
    $(`.${id} .v_view`).append(chat);
    //onsole.log('id:');
}

function deleteChat_1_1(id){
    $(`.${id} .v_view .chat_1_1`).remove()
}

function get11MuteCome(id){
    if(document.getElementById('mute').innerHTML == "소리켜기") { userStreams['meeting'][id].getAudioTracks()[0].enabled=false; console.log(id,"off"); }
    if(document.getElementById('mute').innerHTML == "소리끄기") { userStreams['meeting'][id].getAudioTracks()[0].enabled=true; console.log(id,"off"); }
}
