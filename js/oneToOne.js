function request_1_1(e) {
    socket.emit("request_1_1", {
        socketId: socket.id,
        target: e.target.id,
        userName: userName,
    });
}

function get11Request(message) {
    console.log(message.userName);
    document.getElementsByClassName('c_y')[1].innerHTML = message.userName;
    document.getElementsByClassName('chat_accept')[0].setAttribute('style', 'display:block;');
}