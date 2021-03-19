var localVideo = document.getElementById("source_cam");

async function getUserStream(){
    let stream = null;
    try{
        stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
            peerIdentity: true
        });
        gotStream(stream);
    } catch(err) {
        alert("If you don't allow cam, you don't use this service:\n" + err);
    }
}

function gotStream(stream){
    var video = localVideo.querySelector('video');
    localVideo.srcObject = stream;
}

getUserStream();