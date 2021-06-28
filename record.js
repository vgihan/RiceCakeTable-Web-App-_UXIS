const https = require('https');
const express = require('express');
const fs = require('fs');
const socketio = require('socket.io');
const request = require('request');

const options = {
    key: fs.readFileSync('./keys/private.key'),
    cert: fs.readFileSync('./keys/cert.crt'),
};

//Https Server
const app = express(); //express 인스턴스
app.use(express.static('./'));

app.get('/',(req,res) => { //get 방식, req는 요청 객체, res는 응답 객체
    res.sendFile(__dirname + '/record.html');
})
app.get('/favicon.ico', function(req, res) { 
    res.sendStatus(204); 
});

const httpsServer = https.createServer(options, app);

httpsServer.listen(441,function () {
    console.log("HTTPS Server is running");
});


//Socket

io = socketio(httpsServer);

const path = './captures/'

io.on('connection',function(socket) {
    console.log('capture socket connected');

    //사진 저장
    socket.on('save',function(data) {
        console.log(data);
        var filename = path+data.index+'_'+data.room+'_'+data.user+'.jpg'
        var url = data.url;
        url = url.replace('data:image/jpeg;base64,','');
        fs.writeFile(filename,url,'base64',function(error) {
            console.log(error);
        });
    });

    //브라우저 닫으면
    socket.on('disconnect',function(){
        console.log('client disconnected');
    })

});

