let target;
function request_1_1(e) {   //1대1 대화 신청
    socket.emit("request_1_1", {
        socketId: socket.id,
        target: e.target.id,
        userName: userName,
        roomId:roomId
    });
    console.log("e target:",e.target.id)
}

function get11Request(message) {
    document.getElementsByClassName('c_y')[1].innerHTML = message.userName;
    document.getElementsByClassName('chat_accept')[0].setAttribute('style', 'display:block;');
    target=message.userId  //1대1 요청 보낸 id
}

function accept_1_1(){
    document.getElementsByClassName('chat_accept')[0].style = 'display: none;';
    console.log("accept")
    socket.emit("accept_1_1",{target:target, roomId:roomId})
}

function refusal_1_1(){
    document.getElementsByClassName('chat_accept')[0].style = 'display: none;';
    console.log("refusal");
    socket.emit("refusal_1_1",{target:target})
    target='';
}


function set_1_1RequestView(myId, userId){

}

function set_1_1ResponseView(myId, userId){
    
}

function set_1_1OthersView(user1Id, user2Id){
    
}