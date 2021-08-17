function send_file() {
    if(document.getElementById('btn_send').text=='전송'){ //#11
        var select = document.getElementsByName('uploadFile')[0];
        if(select.value !== "" ) {
            document.getElementsByName("file_roomid")[0].value=roomId;
            document.getElementsByName("btn_submit")[0].click();
        }
        document.getElementById('btn_send').text='입력'; //#11
    }

    socket.emit("send_file_request");
}

function select_file() { document.getElementsByName('uploadFile')[0].click(); }

function show_file(file) {
    document.getElementById('msg_box').value ='';
    for(var i=0; i<file.files.length; i++) {
        var path = file.files[i].name;
        var each = path.split("\\");
        var eachname = each[each.length-1];
        document.getElementById('msg_box').value += eachname+'\n';
    }

    document.getElementById('btn_send').text='전송'; //#11
}
