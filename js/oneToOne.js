//#11
let targetId;
let targetName;

// (건 사람) 1:1 대화하기 버튼 누르면
function request_1_1(e) {
    if(document.getElementById(e.target.id).innerHTML == "1 : 1 대화신청"){
        socket.emit("request_1_1", {
            socketId: socket.id,
            target: e.target.id,
            userName: userName,
            possible: document.getElementById(e.target.id).innerHTML
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
        userName: userName
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
    document.getElementsByClassName('target_nicknm')[0].innerHTML = name;
}

// 1:1 종료
function end_1_1() {
    socket.emit("end_1_1",{target: targetId});

    document.getElementsByClassName('target_nicknm')[0].innerHTML = '';
    document.getElementById('target_video').srcObject = null;
    document.getElementById('my_video').srcObject = null;

    document.getElementsByClassName('conversation')[0].setAttribute('style', 'display:none;');
    document.getElementsByClassName('inner')[0].setAttribute('style', 'display:block;');
    
    targetId=null;
    targetName=null;
}

// (다른사람들 - 시작)
function get11OtherStart(message) {
    console.log("누군가 1:1 시작함");
    setOther(message.user1Id,message.user2Id);
}
// (다른 사람들)
function setOther(user1Id,user2Id){
    console.log(user1Id);
    console.log(user2Id);
}
//#11


