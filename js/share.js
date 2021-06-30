function shareStart() {
    var shareViewTags = `<div>
                            <video id='share_video' autoplay playsinline>
                         </div>`;
    var selfViewTags = `<div>
                            <video id='self_video' autoplay playsinline>
                            <div class="info_ctxt">
                                <div class="nicknm">${userName}</div>
                            </div>
                        </div>`;
    var endButton =    `<p>지금은</p>
                        <p>PC 화면 공유 중</p>
                        <p>입니다</p>
                        <a href="meeting.html">종료하기</a>`;

    document.getElementsByClassName('view_all')[0].innerHTML = shareViewTags;
    document.getElementsByClassName('self_view')[0].innerHTML = selfViewTags;
    document.getElementsByClassName('share_end')[0].innerHTML = endButton;

    document.getElementsByClassName('view_all')[0].style = 'display: block;';
    document.getElementsByClassName('self_view')[0].style = 'display: block;';
    document.getElementsByClassName('share_end')[0].style = 'display: block;';
    document.getElementsByClassName('inner')[0].style = 'display: none;';

    navigator.mediaDevices.getDisplayMedia({
        audio:true,
        video:true
    }).then(async function(stream){ 
        document.getElementById('share_video').srcObject = stream;
    }).catch(error => {
            console.log('error display stream',error);
    });

    document.getElementById('self_video').srcObject = selfStream;
}
