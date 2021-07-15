let targetId;
let targetName;

let talking_stream = {};

// (건 사람) 1:1 대화하기 버튼 누르면
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

// (받는사람) 1:1 대화하기 수락-거절 창 뜬다
function get11Request(message) {
    document.getElementsByClassName('c_y')[1].innerHTML = message.userName;
    document.getElementsByClassName('chat_accept')[0].setAttribute('style', 'display:block;');
    targetId = message.userId;
    targetName = message.userName;
}

// (받는사람) 수락누름
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

// (받는사람) 거절누름
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

// (건사람) 수락받음
function get11Accept(message) {
    targetId = message.userId;
    targetName = message.userName;
    set11(targetId,targetName);
}

// (건사람) 거절받음
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
    
    targetId=null;
    targetName=null;
}

// 1:1 대화 안하는 사람들
function setOther(message) {
    receiveVideos['meeting'][message.user1Id].srcObject = null;
    receiveVideos['meeting'][message.user2Id].srcObject = null;
    document.getElementById(message.user1Id).innerHTML = "1 : 1 대화 중";
    document.getElementById(message.user1Id).setAttribute('style', 'background:#8f8f8f;');
    document.getElementById(message.user2Id).innerHTML = "1 : 1 대화 중";
    document.getElementById(message.user2Id).setAttribute('style', 'background:#8f8f8f;');

}
function endOther(message) {
    receiveVideos['meeting'][message.user1Id].srcObject = userStreams['meeting'][message.user1Id];
    receiveVideos['meeting'][message.user2Id].srcObject = userStreams['meeting'][message.user2Id];
    document.getElementById(message.user1Id).innerHTML = "1 : 1 대화신청";
    document.getElementById(message.user1Id).setAttribute('style', 'background:#ffcc00;');
    document.getElementById(message.user2Id).innerHTML = "1 : 1 대화신청";
    document.getElementById(message.user2Id).setAttribute('style', 'background:#ffcc00;');
}

function ingOther(message) {
    document.getElementById(message.user1Id).innerHTML = "1 : 1 요청 중";
    document.getElementById(message.user2Id).innerHTML = "1 : 1 요청받음";
}

function noIngOther(message) {
    document.getElementById(message.user1Id).innerHTML = "1 : 1 대화신청";
    document.getElementById(message.user2Id).innerHTML = "1 : 1 대화신청";
}


