const socket = new WebSocket("localhost:3020");

let localVideo = document.getElementById('localVideo');
let remoteVideo = document.getElementById('remoteVideo');
let localStream;
let remoteStream;
let peerConnection = new RTCPeerConnection(servers);

mediaConstraints = {
    video: true,
    audio: true
};

navigator.mediaDevices.getUserMedia(mediaConstraints)
.then(gotStream)
.catch((error) => {console.error});

var servers = {
    'iceServers': [{url:'stun:stun.l.google.com:19302'},
    {
        url: 'turn:numb.viagenie.ca',
        credential: 'muazkh',
        username: 'webrtc@live.com'
    }]
}







peerConnection.setRemoteDescription(desc).then(() => {
    return navigator.mediaDevices.getUserMedia(mediaConstraints);
  }).then((stream) => {
    localStream = stream;
    document.getElementById("localVideo").srcObject = localStream;
    return PeerConnection.addStream(localStream);
  }).then(() => {
    return PeerConnection.createAnswer(); //No error when removed this then chain
  }).then((answer) => {
    return PeerConnection.setLocalDescription(answer); // No error when removed this then chain
  }).then(() => {
    socket.emit('video-answer', {
      sdp: PeerConnection.localDescription
    });
  }).catch(handleGetUserMediaError);








peerConnection.onicecandidate = handleIceCandidate;
peerConnection.ontrack = handleRemoteStreamAdded;
peerConnection.onnegotiationneeded = doAnswer;
doCall();


function gotStream(stream){
    console.log("Adding local stream");
    localStream = stream;
    localVideo.srcObject = stream;
    for(const track of localStream.getTracks()){
        peerConnection.addTrack(track);
    }
    console.log(peerConnection.getReceivers());
}

function sendMessage(message){
    var msgJSON = JSON.stringify(message);
    socket.send(msgJSON);
}

function handleRemoteStreamAdded(event){
    console.log("Handle Remote Stream Added");
    remoteStream = event.streams[0];
    remoteVideo.srcObject = remoteStream;
}

function handleIceCandidate(event){
    if(event.candidate){
        var message = {
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate
        }
        sendMessage(message);
    }
}

function setLocalAndSendMessage(sessionDescription) {
    peerConnection.setLocalDescription(sessionDescription);
    console.log("setLocalAndSendMessage");
    sendMessage(sessionDescription);
}

function handleCreateOfferError() { 
    console.log("Offer Error");
}

function doCall() {
    console.log("sending offer to peer");
    peerConnection.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function doAnswer() {
    console.log("Sending answer to peer");
    peerConnection.createAnswer()
    .then(setLocalAndSendMessage)
}