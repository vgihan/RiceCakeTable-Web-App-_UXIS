let targetId;
let targetName;

let talking_stream = {};

// 1:1 대화하기 버튼 누르면
function request_1_1(e) {
    if(document.getElementById(e.target.id).innerHTML == "1 : 1 대화신청"){
        socket.emit("request_1_1", {
            socketId: socket.id,
            target: e.target.id,
            userName: userName,
            roomId: roomId,
            text: document.getElementById(e.target.id).innerHTML
        });
        
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
    

}

// 거절 받음
function get11Refusal(message) {
    document.getElementsByClassName('c_y')[2].innerHTML = message.userName;
    document.getElementsByClassName('chat_accept')[1].setAttribute('style', 'display:block;');
    
}
function okay_1_1() {
    document.getElementsByClassName('chat_accept')[1].setAttribute('style', 'display: none;');
}

// 1:1 세팅
function set11(id,name){
    document.getElementsByClassName('inner')[0].setAttribute('style', 'display:none;');
    document.getElementsByClassName('conversation')[0].setAttribute('style', 'display:block;');

    document.getElementsByClassName('cc_btn')[1].setAttribute('style', 'display:none;'); //공유버튼 안보이게
    document.getElementsByClassName('h_btn')[0].setAttribute('onclick','disableShare()');
    
    document.getElementById('target_video').srcObject = userStreams['meeting'][id];
    document.getElementById('my_video').srcObject = selfStream;
}

// 1:1 종료
function end_1_1() {
    socket.emit("end_1_1",{
        socketId: socket.id,
        target: targetId,
        roomId: roomId
    });

    document.getElementById('target_video').srcObject = null;
    document.getElementById('my_video').srcObject = null;

    document.getElementsByClassName('conversation')[0].setAttribute('style', 'display:none;');
    document.getElementsByClassName('inner')[0].setAttribute('style', 'display:block;');

    document.getElementsByClassName('cc_btn')[1].setAttribute('style', 'display:block;'); //공유버튼 보이게
    document.getElementsByClassName('h_btn')[0].setAttribute('onclick','shareRequest()');
    
    targetId=null;
    targetName=null;
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
    if(message.user2Id == roomLeader) {
        document.getElementById(message.user2Id).innerHTML = "1 : 1 대화 중";
        document.getElementById(message.user2Id).setAttribute('style', 'background:#8f8f8f;');
    }
    document.getElementsByClassName('cc_btn')[1].setAttribute('style', 'display:none;'); //공유버튼 안보이게
    document.getElementsByClassName('h_btn')[0].setAttribute('onclick','disableShare()');
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
    if(message.user2Id == roomLeader) {
        document.getElementById(message.user2Id).innerHTML = "1 : 1 대화신청";
        document.getElementById(message.user2Id).setAttribute('style', 'background:#ffcc00;');
    }
    document.getElementsByClassName('cc_btn')[1].setAttribute('style', 'display:block;'); //공유버튼 보이게
    document.getElementsByClassName('h_btn')[0].setAttribute('onclick','shareRequest()');

}

// 요청 받았을 때 나머지 사람들
function ingOther(message) {
    // document.getElementById(message.user1Id).innerHTML = "1 : 1 요청 중";
    // document.getElementById(message.user2Id).innerHTML = "1 : 1 요청받음";
    if(message.user1Id == roomLeader) {
        document.getElementById(message.user1Id).innerHTML = "1 : 1 요청받음";
        document.getElementById(message.user1Id).setAttribute('style', 'background:#8f8f8f;');
    }
    if(message.user2Id == roomLeader) {
        document.getElementById(message.user2Id).innerHTML = "1 : 1 요청받음";
        document.getElementById(message.user2Id).setAttribute('style', 'background:#8f8f8f;');
    }
}

function disableShare(){
    alert('1대1 대화중에는 화면공유가 불가능합니다.');
}