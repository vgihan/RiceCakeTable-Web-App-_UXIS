window.onload = () => {
    var roomNumber = Math.random().toString(36).substr(2,11);

    document.getElementsByClassName('lbox r_date')[0].innerHTML
         = "<p>방번호 : <span>" + roomNumber + "</span></p>";
    
    var roomIdTag = document.createElement('input');
    roomIdTag.setAttribute('type', 'hidden');
    roomIdTag.setAttribute('name', 'room_id');
    roomIdTag.setAttribute('value', roomNumber);
    document.getElementsByClassName('lbox r_date')[0].appendChild(roomIdTag);
}