function shareStart() {
    navigator.mediaDevices.getDisplayMedia({
        audio:true,
        video:true
    }).then(async function(stream){ 
        document.getElementsByClassName('nicknm')[0].innerHTML = userName;

        document.getElementsByClassName('view_all')[0].style = 'display: block;';
        document.getElementsByClassName('view_lbox')[0].style = 'display: block;';
        document.getElementsByClassName('chat1_1_cc')[0].style = 'display: block;';
        document.getElementsByClassName('inner')[0].style = 'display: none;';

        document.getElementById('share_video').srcObject = stream;
    }).catch(error => {
            console.log('error display stream',error);
    });

    document.getElementById('self_video').srcObject = selfStream;
}
