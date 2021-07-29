const express = require('express');
const app = express();
const https = require('https');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const wrtc = require('wrtc');
const fs = require('fs');
const formidable = require('formidable')
/*
const connection = mysql.createConnection({
    host    : 'localhost',
    user    : 'root',
    password: '254425',
    database: 'better_teaching'
});

connection.connect();
*/
app.set('view engine', 'ejs');
app.use(express.static(__dirname));
app.use(bodyParser.urlencoded({extended: false}));

const options = {
    key: fs.readFileSync('/etc/letsencrypt/live/betterteaching.xyz/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/betterteaching.xyz/fullchain.pem')
    //key: fs.readFileSync('./key/privkey.pem'),
    //cert: fs.readFileSync('./key/cert.crt')
};

const server = https.createServer(options, app).listen(443, () => {
    console.log("Create HTTPS Server");
});

//-------------------------------------RUN TIME DATA-----------------------------------
let roomList = {};
let users = {};
let rooms = {};
let roomToTime={};

let sendPCs = {
    'seminar':{},
    'meeting':{},
    'share':{}
};
let receivePCs = {
    'seminar':{},
    'meeting':{},
    'share':{}
};

let userStreams = {
    'seminar':{},
    'meeting':{},
    'share':{},
};
let numOfUsers = {};

let shareSwitch = {};  //해당 room이 true이면 현재 화면공유중
let shareUserId={};   //해당 room의 화면공유자의 id를 가짐

let oneoneUserId = {}

fs.readdir(__dirname+"/uploads", function(error, filelist){ //서버 켜지면 upload 파일 삭제
    try {
        for(var i=0; i<filelist.length; i++){
            delete_directory(__dirname+'/uploads/'+filelist[i]);
        }
        console.log("delete",filelist.length,"files in uploads");
    }catch(error) {
        console.log(error);
    }       
})

//-------------------------------------------------------------------------------------

app.get('/', (request, response) => {
    response.render('login.ejs');
});

app.get('/dashboard', (request, response) => {
    response.render('dashboard.ejs');
});

app.post('/login', (request, response) => {
    var requestRoomId = request.body.input_rm;
    var requestUserName = request.body.input_nm;
	
    if(users[rooms[requestRoomId]['room_leader']]==undefined){
        response.redirect('/');
        return;
    }
    
    if(!roomList[requestRoomId]) {
        response.redirect('/');
        return;
    }
    if(rooms[requestRoomId]['room_type'] === 'meeting') {
        response.render('meeting.ejs', {
            roomId: requestRoomId,
            userName: requestUserName,
            roomType: 'meeting',
        });
        return;
    }
    if(rooms[requestRoomId]['room_type'] === 'seminar') {
        response.render('seminar.ejs', {
            roomId: requestRoomId,
            userName: requestUserName,
            roomType: 'seminar',
        });
        return;
    }
});

app.get('/make-room', (request, response) => {
    response.render('select.ejs');
});

app.get('/make-meeting', (request, response) => {
    response.render('select_new_meeting');
});

app.get('/make-seminar', (request, response) => {
    response.render('select_new_seminar');
});

app.post('/make-meeting', (request, response) => {
    let roomId = request.body.room_id;
    let roomName = request.body.input_rm;
    let userName = request.body.input_nm;

    roomList[roomId] = {};
    rooms[roomId] = {
        room_name: roomName,
        room_type: 'meeting',
        room_leader: undefined,
    };
    
    make_directory(__dirname+'/uploads/'+roomId); //file upload
	
    response.render('meeting.ejs', {
        roomId: roomId,
        userName: userName,
        roomType: 'meeting',
    });
});

app.post('/make-seminar', (request, response) => {
    let roomId = request.body.room_id;
    let roomName = request.body.input_rm;
    let userName = request.body.input_nm;

    roomList[roomId] = {};
    rooms[roomId] = {
        room_name: roomName,
        room_type: 'seminar',
        room_leader: undefined,
    };
    
    make_directory(__dirname+'/uploads/'+roomId); //file upload
	
    response.render('seminar.ejs', {
        roomId: roomId,
        userName: userName,
        roomType: 'seminar',
    });
});

app.get('/meeting', (request, response) => {
    response.render('meeting.ejs', {
        roomId: requestRoomId,
        userName: requestUserName
    });
});

app.get('/seminar', (request, response) => {
    response.render('meeting_seminar.ejs', {
        roomId: requestRoomId,
        userName: requestUserName
    });
});

app.get('/exit', (request, response) => {
    response.redirect('/');
});

//file upload
app.post('/send-file', function (request, response, next) {
    var form = new formidable.IncomingForm();
    form.multiples = true;
    var roomid;

    form.parse(request,function(error,fields,files) {
        roomid = fields.file_roomid;
        console.log('Send File : ',roomid);
        console.log(files);
    });

    form.on('end',function() {
        for(var i=0; i<this.openedFiles.length; i++) {
            var oldpath = this.openedFiles[i].path
            var newpath = __dirname + "/uploads/" + roomid + '/' + this.openedFiles[i].name;
            fs.rename(oldpath,newpath, function(error){
                if(error) console.log(error);
            }); 
        }
    });
    //response.send(200);
});

app.post('/download',function(request,response) {
    var filepath = __dirname + "/uploads/"+ request.body.filename;;
    console.log("Download : ",filepath);
    response.download(filepath);
});

//-----------------------------------------------------------------------

const io = require('socket.io')(server);

const pc_config = {
    iceServers: [
        // {
        //   urls: 'stun:[STUN_IP]:[PORT]',
        //   'credentials': '[YOR CREDENTIALS]',
        //   'username': '[USERNAME]'
        // },
        {
            urls: "stun:edu.uxis.co.kr"
        },
        {
            urls: "turn:edu.uxis.co.kr?transport=tcp",
                    "username": "webrtc",
                    "credential": "webrtc100!"
        }
    ],
}

//--------------------------EVENT Handler----------------------------------------
let ontrackHandler = {
    'meeting': meetingOntrackHandler,
    'seminar': seminarOntrackHandler,
    'share': shareOntrackHandler,
};

let joinRoomHandler = {
    'meeting': meetingJoinRoomHandler,
    'seminar': seminarJoinRoomHandler,
}
//-------------------------------------------------------------------------------

io.on('connection', function(socket) {
    console.log("connection");
    
    //클라이언트 -> 서버 peerConnection offer
    socket.on("sender_offer", async (message) => {
        try {
            var offer = message.offer;
            var socketId = socket.id;//message.senderSocketId;
            var roomId = message.roomId;
            var userName = message.userName;
            
            let pc = createReceiverPeerConnection(socket, roomId, userName, ontrackHandler[message.purpose], message.purpose);
            let answer = await createReceiverAnswer(offer, pc);

            receivePCs[message.purpose][socketId] = pc;

	        if(message.purpose== 'share'){ //share가 목적인 경우 share화면의 stream의 오퍼를 받는것까진 성공했으니 switch를 바꿔줌
                shareSwitch[users[socket.id]['room_id']] = true;
                shareUserId[users[socket.id]['room_id']]=socket.id;
            }
	    
            await io.to(socketId).emit("get_sender_answer", { 
                answer,
                purpose: message.purpose,
            });
        } catch (error) {
            console.error(error);
        }
    });

    //클라이언트 <- 서버 peerConnection offer
    socket.on("receiver_offer", async (message) => {
        try {
            let offer = message.offer;
            let purpose = message.purpose;
            let senderSocketId = message.senderSocketId;
            let receiverSocketId = message.receiverSocketId;

            //console.log(userStreams['share'][senderSocketId].getVideoTracks().length);

            let pc = createSenderPeerConnection(
                receiverSocketId,
                senderSocketId,
                userStreams[purpose][senderSocketId],
                purpose,
            );
            let answer = await createSenderAnswer(offer, pc);

            if(!sendPCs[purpose][senderSocketId]){
                sendPCs[purpose][senderSocketId] = {};
            }
            sendPCs[purpose][senderSocketId][receiverSocketId] = pc;

            await io.to(receiverSocketId).emit("get_receiver_answer", {
                id: senderSocketId,
                purpose: purpose,
                answer,
            });
        } catch (error) {
            console.error(error);
        }
    });

    //클라이언트 -> 서버 candidate
    socket.on("sender_candidate", (message) => {
        try {
            let pc = receivePCs[message.purpose][message.senderSocketId];
            if(!message.candidate) return;
            if(!pc) return;
            pc.addIceCandidate(new wrtc.RTCIceCandidate(message.candidate));
        } catch (error) {
            console.error(error);
        }
    });

    //클라이언트 <- 서버 candidate
    socket.on("receiver_candidate", (message) => {
        try {
            if(!message.candidate) return;
            if(!sendPCs[message.purpose][message.senderSocketId]) return;
            if(!sendPCs[message.purpose][message.senderSocketId][message.receiverSocketId]) return;

            let pc = sendPCs[message.purpose][message.senderSocketId][message.receiverSocketId];
            pc.addIceCandidate(new wrtc.RTCIceCandidate(message.candidate));
        } catch (error) {
            console.error(error);
        }
    });

    //방에 처음 접속한 user에게 접속하고 있었던 user들의 정보를 제공하는 역할
    socket.on("join_room", async (message) => {
        joinRoomHandler[message.purpose](message, socket);
        if(shareSwitch[message.roomId]==true){
            shareJoinRoomHandler(message,socket);
        }
    });

    //노캠 사용자 입장
    socket.on("noCam",function (data){       
        userStreams['meeting'][socket.id] = null;
        socket.broadcast.to(data.roomId).emit("user_enter", { //노캠 사용자의 접속을 알림
            socketId: socket.id,
            roomId: data.roomId,
            userName: data.userName,
            purpose: 'meeting',
            stream : null
        });
    });


    //통신 종료
    socket.on("meeting_disconnect", () => {
        try {
            console.log('meeting disconnect');
            
            let roomId = users[socket.id]['room_id'];
            let socketId = socket.id;
            let userName = users[socket.id]['user_name'];
            let roomType = rooms[roomId]['room_type'];
            let roomLeader = rooms[roomId]['room_leader'];

            
            numOfUsers[roomId]--;

            deleteUser(socketId, roomId);
            closeReceiverPC(socketId, roomType);
            closeSenderPCs(socketId, roomType);

            socket.broadcast.to(roomId).emit("user_exit", { 
                id: socketId,
                userName: userName,
                purpose: roomType,
            });

            if(roomLeader !== socket.id) closeSenderPCs(socket.id, 'meeting');
            else {
                for(var key in roomList[roomId]) {
                    closeReceiverPC(key, 'meeting');
                    deleteUser(key, roomId);
                    closeSenderPCs(key, 'meeting');
                }
                delete userStreams['meeting'][socket.id];
                delete rooms[roomId];
                delete roomList[roomId];
                delete numOfUsers[roomId];
		        delete oneoneUserId[roomId];
            }

            if(roomList[roomId]===undefined){
                delete roomToTime[roomId];
		delete_directory(__dirname+'/uploads/'+roomId); //file upload
            }
        } catch (error) {
            console.error(error);
            console.log('room_id나 user_name 에러의 경우 신경 안써도 됨~')
        }
        show_state('meeting')
    });

    socket.on('seminar_disconnect', () => {
        try {
            console.log('seminar disconnect');
        
            var roomId = users[socket.id]['room_id'];
            var roomLeader = rooms[roomId]['room_leader'];
            let roomType = rooms[roomId]['room_type'];
            
            deleteUser(socket.id, roomId);
            closeReceiverPC(socket.id, roomType);
            closeSenderPCs(socket.id, roomType);
            
            socket.broadcast.to(roomId).emit("user_exit", { 
                socketId: socket.id,
            });

            numOfUsers[roomId]--;

            if(roomLeader !== socket.id) closeSenderPCs(socket.id, 'seminar');
            else {
                for(var key in roomList[roomId]) {
                    closeReceiverPC(key, 'seminar');
                    deleteUser(key, roomId);
                }
                delete userStreams['seminar'][socket.id];
                delete rooms[roomId];
                delete roomList[roomId];
                delete numOfUsers[roomId];
            }
            if(roomList[roomId]===undefined){
                delete roomToTime[roomId];
		        delete_directory(__dirname+'/uploads/'+roomId); //file upload
            }
        } catch(err) {
            console.error(err);
        }
        show_state('seminar')
    });
    
    socket.on('share_disconnect', () => {
        console.log('share disconnect');
        try{
            if(!shareSwitch[users[socket.id]['room_id']]) return;
            shareSwitch[users[socket.id]['room_id']] =false;

            receivePCs['share'][socket.id].close();
            delete receivePCs['share'][socket.id];
            for(var key in roomList[users[socket.id]['room_id']]) {
                try{
                    if(!sendPCs['share'][socket.id][key]) continue;

                    sendPCs['share'][socket.id][key].close();
                    delete sendPCs['share'][socket.id][key];

                    if(!userStreams['share'][socket.id][key]) continue;

                    delete userStreams['share'][socket.id][key];
                }
                catch{
                    delete userStreams['share'][socket.id][key];
                }


            }
            delete sendPCs['share'][socket.id];
            delete userStreams['share'][socket.id]
            socket.broadcast.to(users[socket.id]['room_id']).emit('share_disconnect');

            //delete shareSwitch[users[socket.id]['room_id']];
            
            delete shareUserId[users[socket.id]['room_id']];
        }
        catch(e){
            console.error(e);
        }

    });

    socket.on('room_info', (message) => {
        if(!rooms[message.roomId]['room_leader']) {
            rooms[message.roomId]['room_leader'] = socket.id;
        }
        let roomLeader = rooms[message.roomId]['room_leader'];

        if(!numOfUsers[message.roomId]) {
            socket.emit('room_info', {
                roomLeader: roomLeader,
                numOfUsers: 1,
                roomType: message.roomType,
                userName: message.userName,
                leaderName: message.userName,
            });
            numOfUsers[message.roomId] = 1;
            return;
        }

        socket.emit('room_info', {
            roomLeader: roomLeader,
            numOfUsers: ++numOfUsers[message.roomId],
            roomType: message.roomType,
            userName: message.userName,
            leaderName: users[roomLeader]['user_name'],
        });
    });

    
    socket.on('request_1_1', (message) => {
        if(message.text == "1 : 1 대화신청") {
            for(var key in roomList[message.roomId]) {
                if(key === message.target) { // 1:1 받은 사람에게
                    io.to(key).emit('get_1_1_request', {
                        userName: message.userName,
                        userId: message.socketId
                    });
                }
                else if(key !== message.socketId){
                    io.to(key).emit('other_ing_request', { // 나머지 사람에게
                        user1Id: message.socketId,
                        user2Id: message.target
                    });
                }
            }
        }
    });
 
    socket.on('accept_1_1', (message) => {
        for(var key in roomList[message.roomId]) {
            if(key === message.target) { // 1:1 건 사람에게
                io.to(key).emit('accept_request', {
                    userName: message.userName,
                    userId: message.socketId
                });
            }
            else if(key !== message.socketId){
                io.to(key).emit('other_accept_request', { // 나머지 사람에게
                    user1Id: message.socketId,
                    user2Id: message.target
                });
            }
        }
        if (socket.id == rooms[message.roomId]['room_leader']) 
            oneoneUserId[message.roomId] = message.target
        else 
            oneoneUserId[message.roomId] = socket.id
    
    });
	
    socket.on('refusal_1_1', (message) => {
        for(var key in roomList[message.roomId]) {
            if(key === message.target) { // 1:1 건 사람에게
                io.to(key).emit('refusal_request',{userName: message.userName, userId: message.socketId});
            }
            else if(key !== message.socketId){
                io.to(key).emit('other_end_request', { // 나머지 사람에게
                    user1Id: message.socketId,
                    user2Id: message.target
                });
            }
        }
    });

    socket.on('end_1_1', (message) => {
        console.log('end 1_1 !!!!');
        for(var key in roomList[message.roomId]) {
            if(key === message.target) { // 대화 상대방에게
                io.to(key).emit('end_request');
            }
            else if(key !== message.socketId){
                io.to(key).emit('other_end_request', { // 나머지 사람에게
                    user1Id: message.socketId,
                    user2Id: message.target
                });
            }
        }
        oneoneUserId[message.roomId]=null;
    });

    socket.on("mute_list", (message) => {
        var others = [];
        for(var key in roomList[message.roomId]) {
            if(key !== message.target && key !== message.socketId) { // 대화 상대방에게
                others.push(key);
            }
        }
        socket.emit("mute_list_request", {others : others});
    });

    //화면 공유
    // socket.on('display_share', (message) => {

    // });
	
    socket.on('set_room_time', function(data) {
        if(roomToTime[data.roomId]===undefined)
            roomToTime[data.roomId]=data.time;
        else
            socket.emit('get_room_time',{time:roomToTime[data.roomId]});
        //console.log("roomToTime:",roomToTime[data.roomId]);
    });
    socket.on('req_chat',function(data){
        //새로 접속한 사용자에게 채팅정보 전송
        /*
        connection.query("SELECT * FROM chat_db where roomId = '"+data.roomId+"' and roomTime ="+roomToTime[data.roomId], function (err, result, fields) {
            if (err) throw err;
            //console.log(result);
            console.log('request_chat');
            socket.emit('get_chat',result)
        });*/	
    });

    socket.on('message', (data) => {
        console.log("chat_"+data.userName,":",data.message)
        /* 보낸 사람을 제외한 나머지 유저에게 메시지 전송 */
        socket.broadcast.to(data.roomId).emit('update', data);
        /*
        //mysql에 대화 정보 저장
        var sql = "INSERT INTO chat_db (userName, roomId, roomTime, msg) VALUES ('"+ data.userName +"','"+ data.roomId+"','"+data.roomTime+"','"+data.message+"')";
        connection.query(sql, function (err, result) {
        if (err) throw err;
        console.log("1 record inserted");
        });
        */
    });

    socket.on("show",function (data){  //확인용
        console.log("===================")
        console.log(data," sendPCs:",sendPCs[data])
        console.log("share sendPCs:",sendPCs['share'])
        console.log(data," receivePCs:",receivePCs[data])
        console.log("share receivePCs:",receivePCs['share'])
        console.log("share userStreams:",userStreams['share'])
        console.log("userStreams:",userStreams[data])
        //console.log("roomList",roomList);
        console.log("users",users)
        console.log("roomList:",roomList)
        console.log("shareUserId:",shareUserId);
    });

    socket.on("ex",function (data){  //확인용
        console.log("!!XXXX!!")
    });

    socket.on("leader_socket_id_request", (message) => {
        io.to(socket.id).emit("leader_socket_id_response", {
            leaderSocketId: rooms[message.roomId]['room_leader'],
        });
    });

    socket.on("share_question", (data) => {
        if(shareSwitch[users[socket.id]['room_id']]) return;

        io.to(socket.id).emit("share_possible");
        //shareSwitch[users[socket.id]['room_id']] = true;       //여기서 해주려다가 공유를 취소해도 true가 되는 에러를 방지하기위해 sender_offer로 옮김
        //shareUserId[users[socket.id]['room_id']]=socket.id;
    });

    socket.on('reqUserInfo',function (data){ //보여줄 정보 전달
        socket.emit('ansUserInfo',{
            roomList:roomList,
            rooms:rooms,
            users:users,
            //userStreams:userStreams,
            numOfUsers:numOfUsers,
        })
    })


});

function createSenderPeerConnection(receiverSocketId, senderSocketId, stream, purpose) {
    let pc = new wrtc.RTCPeerConnection(pc_config);
    
    pc.onicecandidate = (e) => {
        if(e.candidate) {
            io.to(receiverSocketId).emit("get_receiver_candidate", {
                id: senderSocketId,
                candidate: e.candidate,
                purpose: purpose,
            });
        }
    }

    pc.oniceconnectionstatechange = (e) => {
        //console.log(e);
    }

    stream.getTracks().forEach((track => {
        pc.addTrack(track, stream);
    }));

    return pc;
}

function createReceiverPeerConnection(socket, roomId, userName, ontrackHandler, purpose) {
    let pc = new wrtc.RTCPeerConnection(pc_config);
    
    pc.onicecandidate = (e) => {
        if(!e.candidate) return;
        io.to(socket.id).emit("get_sender_candidate", {
            candidate: e.candidate,
            purpose: purpose,
        });
    }

    pc.oniceconnectionstatechange = (e) => {
        //console.log(e);
    }
    var once_ontrack=1
    pc.ontrack = (e) => {
        if(once_ontrack==1){ //video, audio로 두번하므로 한번만 하도록
            ontrackHandler(e.streams[0], socket, roomId, userName);
        }
        once_ontrack+=1;
    }
    return pc;
}

async function createSenderAnswer(offer, pc) {
    try {
        await pc.setRemoteDescription(offer);
        let answer = await pc.createAnswer({
            offerToReceiveAudio: false,
            offerToReceiveVideo: false,
        });
        await pc.setLocalDescription(answer);

        return answer;
    } catch(err) {
        console.error(err);
    }
}

async function createReceiverAnswer(offer, pc) {
    try {
        await pc.setRemoteDescription(offer);
        let answer = await pc.createAnswer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(answer);

        return answer;
    } catch(err) {
        console.error(err);
    }
}

function meetingOntrackHandler(stream, socket, roomId, userName) {
    console.log('meeting handler')
   
    userStreams['meeting'][socket.id] = stream;

    socket.broadcast.to(roomId).emit("user_enter", { 
        socketId: socket.id,
        roomId: roomId,
        userName: userName,
        purpose: 'meeting',
        stream : stream
    });
    
    //이전 채팅 보내기 
    /*
    connection.query("SELECT * FROM chat_db where roomId = '"+roomId+"' and roomTime ="+roomToTime[roomId], function (err, result, fields) {
        if (err) throw err;
        //console.log(result);
        console.log('request_chat');
        socket.emit('get_chat',result)
    });	
    */
    return;
}

function seminarOntrackHandler(stream, socket, roomId, userName) {
    console.log('seminar handler')
   /*  
    socket.broadcast.to(roomId).emit("user_enter", {    //세미나는 첫 접속자가 왔을때만 ontrackHandler가 실행되는데 이때는 broadcast해도 받을 socket이 없어서 의미없음
        socketId: socket.id,
        roomId: roomId,
        userName: userName,
        purpose: 'seminar',
    });
    */
    userStreams['seminar'][socket.id] = stream;
   
    //이전 채팅 보내기 
    /*
    connection.query("SELECT * FROM chat_db where roomId = '"+roomId+"' and roomTime ="+roomToTime[roomId], function (err, result, fields) {
        if (err) throw err;
        //console.log(result);
        console.log('request_chat');
        socket.emit('get_chat',result)
    });	
    */

    return;
}

function shareOntrackHandler(stream, socket, roomId, userName) {
    console.log('share handler')
   
    socket.broadcast.to(roomId).emit('share_request', {
        userName: userName,
        socketId: socket.id,
    });
    userStreams['share'][socket.id] = stream;
}

function meetingJoinRoomHandler(message, socket) {
    console.log('meeting room:',message.roomId,',',message.userName ,message.senderSocketId);
    try {
        let rows = [];
        for(var key in roomList[message.roomId]) {
            rows.push({
                socket_id: key,
                user_name: users[key]['user_name'],
                stream : userStreams['meeting'][key]
            });
        }
        if(rows.length !== 0) {
            io.to(message.senderSocketId).emit("all_users", { 
                users: rows,
                oneoneUserId: oneoneUserId[message.roomId]
            });
        }else{
            io.to(message.senderSocketId).emit("myId");
            console.log("@@@@@@@@@@@@@@@@@@@@@");
        }
        socket.join(message.roomId);
        roomList[message.roomId][message.senderSocketId] = 1;
        users[message.senderSocketId] = {
            user_name: message.userName,
            room_id: message.roomId,
        };
        console.log('user in:',users)
    } catch (error) {
        console.error(error);
    }
}

function seminarJoinRoomHandler(message, socket) {
    console.log('seminar room:',message.roomId,',',message.userName ,message.senderSocketId);
    try {
        let rows = [];
        for(var key in roomList[message.roomId]) {
            rows.push({
                socket_id: key,
                user_name: users[key]['user_name'],
            });
        }
        if(rows.length !== 0) {
            io.to(message.senderSocketId).emit("all_users", { 
                users: rows,
            });
            socket.broadcast.to(message.roomId).emit("user_enter", { 
                userName: message.userName,
                socketId: message.senderSocketId,
            });
        }
        socket.join(message.roomId);
        roomList[message.roomId][message.senderSocketId] = 1;
        users[message.senderSocketId] = {
            user_name: message.userName,
            room_id: message.roomId,
        };
        console.log('user in:',users)
    } catch (error) {
        console.error(error);
    }
}

function shareJoinRoomHandler(message, socket) {//현재 화면공유중이라면 화면공유 정보를 넘김
    try {
        let rows = [];
        key =  shareUserId[message.roomId] //공유자 id가 key로 바꾸기
        rows.push({
            socket_id: key,   
            user_name: users[key]['user_name'],
        });
        

        io.to(message.senderSocketId).emit("share_users", { 
            users: rows,
        });

    } catch (error) {
        console.error(error);
    }
}

//나간 유저의 정보 삭제
//마지막 유저가 나가면 방이 삭제됨
function deleteUser(socketId, roomId) {
    delete roomList[roomId][socketId];
    delete users[socketId];

    if(Object.keys(roomList[roomId]).length === 0) {
        delete roomList[roomId];
        delete rooms[roomId];
        delete shareSwitch[roomId];
        if(shareUserId[roomId] != undefined) delete shareUserId[roomId];
        return;
    }
}

//받는 peerConnection 종료
function closeReceiverPC(socketId, purpose) {
    if (receivePCs[purpose][socketId]===undefined) return;

    receivePCs[purpose][socketId].close();
    delete receivePCs[purpose][socketId];
}

//보내는 peerConnection 종료
function closeSenderPCs(socketId, purpose) {
    for(var key in sendPCs[purpose]) {
        if(sendPCs[purpose][key][socketId] !==undefined){
            sendPCs[purpose][key][socketId].close()
            delete sendPCs[purpose][key][socketId]
        }
    }


    if(sendPCs[purpose][socketId]===undefined) return;

    for(var key in sendPCs[purpose][socketId]) {
        sendPCs[purpose][socketId][key].close();
        delete sendPCs[purpose][socketId][key];
    }
    delete sendPCs[purpose][socketId];
    

}

function show_state(purpose){
    console.log("state==========");
    console.log("sendPcs:",sendPCs[purpose])
    console.log("receivePCs:",receivePCs[purpose])
    
    
    
    console.log("roomList",roomList);
    console.log("users",users)
    console.log("roomToTime:",roomToTime)
    console.log("roomList:",roomList)
    console.log("rooms:",rooms)
    console.log('numOfUsers',numOfUsers);
}

//file upload
function make_directory(path) {
    // uploads 디렉토리 안 방별 디렉토리 없으면 생성
    const isExist = fs.existsSync(path);
    if(!isExist) {
        fs.mkdirSync(path, {recursive : true});
        console.log("make",path);
    }
}

function delete_directory(path) { //uploads 안의 방별 디렉토리 삭제
    const isExist = fs.existsSync(path);
    if(isExist) {
        fs.readdirSync(path).forEach(function(file) {
                fs.unlinkSync(path+'/'+file);
                console.log("delete",path+'/'+file);
        });
        
        fs.rmdirSync(path);
    }
}
