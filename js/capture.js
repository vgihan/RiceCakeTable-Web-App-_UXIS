let captureRepeated;

async function captureStart(video) {
    console.log(userName,"캡처시작");

    // Canvas 태그 생성
    let canvas = document.createElement('canvas');
    canvas.style.display = 'none';
    canvas.className = 'canvas';
    canvas.height = 500;
    canvas.width = 500;
    let div = document.getElementsByClassName('capture')[0];
    div.appendChild(canvas);

    let canvasEl = document.getElementsByClassName('canvas')[0];
    
    // 일정시간동안 캡처 반복하기
    repeatCapture = await setInterval( function() {
        //console.log("Capture Now : "+roomId+"_"+userName+"_"+captureTime+"_"+i);
        
        let context = canvasEl.getContext('2d')
        context.drawImage(video,0,0,500,500);
        
        let imageUrl = canvasEl.toDataURL('image/jpeg');
       
        //서버 다운로드
        socket.emit('saveCapture', { url: imageUrl
                                    ,room: roomId
                                    ,user: userName});
        console.log('한장 캡처 완료');
    },10000); // 일정시간=10초
}

async function captureStop() {
    await clearInterval(repeatCapture);
}