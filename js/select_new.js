window.onload = () => {
    var roomNumber = Math.random().toString(10).substr(2, 4);

    //document.getElementsByClassName('lbox r_date')[0].innerHTML
    //     = "<p>방번호 : <span>" + roomNumber + "</span></p>";
    var rN = document.getElementById('roomNumber')
    rN.setAttribute('name','new_room_id');
    rN.setAttribute('placeholder',`방번호 : ${roomNumber} (변경 가능)`);
    //rN.value=`${roomNumber}`
    
    
    var roomIdTag = document.createElement('input');
    roomIdTag.setAttribute('type', 'hidden');
    roomIdTag.setAttribute('name', 'room_id');
    roomIdTag.setAttribute('value', roomNumber);
    document.getElementsByClassName('lbox r_date')[0].appendChild(roomIdTag);
}