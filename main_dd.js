//DAO, DTO 사용한 것으로 CRUD 잘 되지만 <-> 웹에서 READ한 결과물을 읽어올수 없음 (이거빼고는 다 정상)

const express = require('express');
const app = express();
const port = 3000;

const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));

const dao = require(__dirname + '/dao.js');
const dto = require(__dirname + '/dto.js');

app.get('/',function(req,res) {
    res.render('main.ejs',{description : "Main Page"});
});

app.get('/read_process',function(req,res){
    var result = dao.readAll();
    if(result) res.render('read.ejs',{description : 'Read Page', data : result});
});

app.post('/write_process',function(req,res){
    dto.setID(req.body._id);
    dto.setRoom(req.body._room);
    dto.setName(req.body._name);
    var check = dao.write();
    if(check) res.redirect('/');
});

app.post('/update_process',function(req,res){
    dto.setID(req.body._id);
    dto.setRoom(req.body._room);
    dto.setName(req.body._name);
    var check = dao.update();
    if(check) res.redirect('/');
});

app.post('/delete_process',function(req,res){
    dto.setID(req.body._id);
    dto.setRoom(req.body._room);
    dto.setName(req.body._name);
    var check = dao.delete();
    if(check) res.redirect('/');
});

app.set('view engine', 'ejs');
app.set('views',__dirname + '/views');

app.listen(port, function() {
    console.log(`Server is run at ${port}`);
});