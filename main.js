/* DAO, DTO 안쓴 것으로 CRUD 웹에서 다 잘 동작 */

//서버 생성
const express = require('express');
const app = express();
const port = 3000;

//JSON 형태의 데이터 전달방식
//URL-encoded는 주소 형식으로 데이터를 보내는 방식
//false면 querystring 모듈 사용해 쿼리스트링 해석
//true면 qs 모듈 사용해 쿼리스트링 해석
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));

//mysql.js 로 부터 init()함수 connect()함수 가져온다
const db = require(__dirname + '/mysql.js');
const connection = db.init();
db.connect(connection);

//routing : 해당 path에 따라 (request에 따라) 어떤 동작을 할지 설정한다

// MAIN
app.get('/',function(req,res) {
    res.render('main.ejs',{description : "Main Page"});
});

// READ
app.get('/read_process',function(req,res){
    connection.query('select * from test', function(error,rows,fields){
        if(error) console.log("query error : " + error);
        else {
            console.log(rows);
            res.render('read.ejs',{description : 'Read Page', data : rows});
        }
    });    
});

//WRITE
app.post('/write_process',function(req,res){
    var body = req.body;
    var value = [body._id, body._name, body._room];

    if(body._id == '') res.redirect('/');
    
    else{
        var sql = 'insert into test (id,name,room_id) values(?,?,?)';
        // 두번재 인자에 값 넣어주면 sql의 ?에 자동 매핑
        connection.query(sql, value, function(error,rows,fields){
            if(error) console.log("query error : " + error);
            else res.redirect('/');
        });
    }
});

//UPDATE
app.post('/update_process',function(req,res){
    var body = req.body;
    var value = [body._room, body._name, body._id];

    if(body._id == '') res.redirect('/');
    
    else{
        var sql = 'update test set room_id=?, name=? where id=?';
        // 두번재 인자에 값 넣어주면 sql의 ?에 자동 매핑
        connection.query(sql, value, function(error,rows,fields){
            if(error) console.log("query error : " + error);
            else res.redirect('/');
        });
    }
});

//DELETE
app.post('/delete_process',function(req,res){
    var body = req.body;
    var sql = 'delete from test where id = ?';
    // 두번재 인자에 값 넣어주면 sql의 ?에 자동 매핑
    connection.query(sql, body._id, function(error,rows,fields){
        if(error) console.log("query error : " + error);
        else res.redirect('/');
    });
});

app.set('view engine', 'ejs'); //express함수는 application 객체를 반환
app.set('views',__dirname + '/views'); //view 경로 설정

app.listen(port, function() {
    console.log(`Server is run at ${port}`);
});

//npm = nodejs의 모듈 관리
//npm install 모듈 ---> 해당 디렉토리에 node_mudules 생성해서 안에
//nodejs 프로젝트가 실행될 때 node_modules 부터 확인한다

//package.json = 설치된 패키지 목록을 관리
//npm init = package.json 생성
//프로젝트에서 사용하는 모듈이 많아질수록 다시 설치하기 번거롭고 하니까
//필요한 패키지들의 목록을 파일로 정리 해놓고 단 한번에 설치하는 등 편하게 (파일 = package.json)

//express = nodejs를 위한 웹 프레임워크
//ejs = nodejs의 템플릿 엔진으로 template과 data가 있으면 합쳐서 결과 페이지르 생성한다 (=앱에서 정적 템플릿 파일 사용할 수 있게 해주는 것)
//( <script> 태그 필요 없이 서버에서의 변수를 가져와 사용하는 html 템플릿 같은 느낌)
//( ejs가 html을 대신같은 느낌으로, html안에 javascript를 삽입해서 동적으로 짤 수 있다)
//app.set('view engine','ejs');
//app.get

//json형태 = 속성-값 쌍으로 이루어진 데이터 object 전달하기 위해 인간이 읽을 수 있는 텍스트 기반 데이터 교환 표준
//render('ejs파일경로','json형태의 넘길 데이터');

//get = 데이터 전달 (query string으로 전송하기 때문에 url에 정보가 노출된다)
//post = 데이터 변경 (bodyparser라는 모듈로 Post request data의 body로부터 파라미터 추출)

//req.body = post 정보 가짐 (요청정보가 url이 아닌 request본문에 들어있기 때문에 body-parser같은 모듈로 파싱할 수 있다)
//req.query = get 정보 가짐 (url로 전송된 쿼리 스트링 담고있다)
//res.send = 다양한 유형의 응답 전송
//res.json = json 응답을 전송
//res.end = 응답을 종료
//res.locals(???????)