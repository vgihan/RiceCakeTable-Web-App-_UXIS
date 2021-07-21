function send_msg() {
    // 입력되어있는 데이터 가져오기
    var message = document.getElementById('msg_box').value;
    // 가져왔으니 데이터 빈칸으로 변경
    document.getElementById('msg_box').value = '';
  
    // 내가 전송할 메시지 클라이언트에게 표시
    const chat_inner = document.getElementById('chat_inners');
    
    if(message !='' & message!='\n'){
        
        //file upload
        if(document.getElementById('btn_send').text==='전송') { //#11
            var href_message='';
            var each = message.split('\n');
            for(var i=0; i<each.length-1; i++) {
                var value = roomId+'/'+each[i]
                href_message += `<div class="file"><img src="img/icon_file.png"><a href="#" onclick='
                                             document.all.filename.value="${value}";
                                             document.all.fileform.submit();
                                             document.all.filename.value="";
                                             '>${each[i]}</a></div><br>`;
            }
            message=href_message;
        }
        
        chat_inner.innerHTML += `<li><h1>${userName}</h1><p>${message}</p></li>`
    
        // 서버로 message 이벤트 전달 + 데이터와 함께
        console.log("message:",message)
        socket.emit('message', {type: 'message', message: message, roomId : roomId, userName : userName, roomTime:roomTime})
        
        chatScrollDown();
        
    }
    
}
function chatScrollDown(){
    var chat_scroll = document.getElementById('mCSB_1_container');  //스크롤 밑으로 내리기
    //console.log("scroll height:",chat_scroll.scrollHeight)
    if(chat_scroll.scrollHeight>460){
        var scroll_down= -(chat_scroll.scrollHeight -470)
        chat_scroll.style.top = `${scroll_down}px`
    }
    //console.log("chat height:",chat_scroll.style.top)
}

function enterkey() { 
    if (window.event.keyCode == 13) {
         // 엔터키가 눌렸을 때 
         send_msg();
         send_file(); //file upload
    }
}

function update(data) {
    const chat_inner = document.getElementById('chat_inners');
    chat_inner.innerHTML += `<li><h1>${data.userName}</h1><p>${data.message}</p></li>`
    
    chatScrollDown();
}

function getChat(data) {
    console.log("get_chat!!!")
    const chat_inner = document.getElementById('chat_inners');
    /*이전 대화목록 받아오기*/
    for(var i=0; i<data.length; i++){
        chat_inner.innerHTML += `<li><h1>${data[i].userName}</h1><p>${data[i].msg}</p></li>`
    }

    chatScrollDown();
}
