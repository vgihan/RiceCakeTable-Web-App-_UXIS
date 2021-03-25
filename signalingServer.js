const express = require('express');
const app = express();
const fs = require('fs');
const https = require('https');
const path = require('path');

app.set('views', path.join(__dirname,'views'));
app.engine('html', require('ejs').renderFile);
app.set('view engine','html');

const options = {
    key: fs.readFileSync('./keys/private.pem'),
    cert: fs.readFileSync('./keys/public.pem')
};

const server = https.createServer(options, app).listen(443, () => {
    console.log("Create HTTPS Server");
});

app.get('/', (request, response) => {
    response.render('rtc.html');
});

//----------------------------------------------------

const io = require('socket.io')(server);

io.on('connection', function(socket) {
    console.log("connection");
    socket.on("clientMessage", (message) => {
        socket.broadcast.emit("serverMessage", message);
        console.log(message);
    });
});