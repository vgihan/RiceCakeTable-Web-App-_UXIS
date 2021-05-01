var id,room,name='';

//getter
exports.getID = function() {
    return id;
};
exports.getRoom = function() {
    return room;
};
exports.getName = function () {
    return name;
};

//setter
exports.setID = function(_id) {
    id = _id;
};
exports.setRoom = function(_room) {
    room = _room;
};
exports.setName = function (_name) {
    name = _name;
};

exports.getInfo = function() {
    return{
        id: id,
        name: name,
        room: room
    };
};
