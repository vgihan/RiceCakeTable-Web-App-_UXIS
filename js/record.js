
let streamId2Id = {}  //streamId를 id로
let id2StreamId={}  //id를 streamId로
let mediaRecorder={}  


function recordStart(stream,id,userName){
    recordersName[stream.id]=userName;
    mediaRecorder[id] = new MediaRecorder(stream);
    //console.log('streamId:',stream.id);
    streamId2Id[stream.id] = id;
    id2StreamId[id]=[stream.id]
    console.log(usersName[id],'녹화시작')
    mediaRecorder[id].ondataavailable = handleDataAvailable;
    mediaRecorder[id].start();
    //setTimeout(event => {
    //    console.log("stopping");
    //    mediaRecorder[id].stop();
    //}, 9000);
}

let recordedChunks = {};

function handleDataAvailable(event) { //stop()후 실행됨
    console.log("data-available");
    recordedChunks[event.currentTarget.stream.id]=[]
    //console.log('msId:',event.currentTarget.stream.id);
    if (event.data.size > 0) {
        recordedChunks[event.currentTarget.stream.id].push(event.data);
        if(is_record === true)  //저장하기를 누른경우만 다운로드
            download(event.currentTarget.stream.id);
    } else {
        ;
    }
}

function download(streamId) {
    var blob = new Blob(recordedChunks[streamId], {
        type: "video/webm"
    });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    a.href = url;
    a.download = `${recordersName[streamId]}_video.webm`;
    console.log(recordersName[streamId],'다운가능');
    a.click();
    window.URL.revokeObjectURL(url);

    try{delete recordersName[streamId];}catch(e){;}
    try{delete recordedChunks[streamId];}catch(e){;}
    try{delete mediaRecorder[streamId2Id[streamId]];}catch(e){;}
}