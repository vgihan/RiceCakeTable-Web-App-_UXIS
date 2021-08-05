mediaRecorder={}

function recordStart(stream,id){
    mediaRecorder[id] = new MediaRecorder(stream);
    //console.log('streamId:',stream.id);
    streamId2Id[stream.id] = id;
    console.log(usersName[id],'녹화시작')
    mediaRecorder[id].ondataavailable = handleDataAvailable;
    mediaRecorder[id].start();
    setTimeout(event => {
        console.log("stopping");
        mediaRecorder[id].stop();
    }, 9000);
}

recordedChunks = [];

function handleDataAvailable(event) {
    console.log("data-available");
    //console.log('msId:',event.currentTarget.stream.id);
    if (event.data.size > 0) {
        recordedChunks.push(event.data);
        //console.log('recordedChunks:',recordedChunks);
        download(event.currentTarget.stream.id);
    } else {
        ;
    }
}

function download(streamId) {
    var blob = new Blob(recordedChunks, {
        type: "video/webm"
    });
    var url = URL.createObjectURL(blob);
    //console.log('url:',url);
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    a.href = url;
    a.download = `${usersName[streamId2Id[streamId]]}_video.webm`;
    console.log('녹화자 이름 :',usersName[streamId2Id[streamId]],'다운가능');
    a.click();
    window.URL.revokeObjectURL(url);
}