/* 데이터 베이스 연결 */

const mysql = require('mysql');

const config = {
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: 'wlswlgkek#3',
    database: 'webrtc'
}
module.exports = {
    init: function(){
        return mysql.createConnection(config);
    },
    connect: function(connection){
        connection.connect(function(err) {
            if(err) console.error('mysql connect error : ' + err);
            else console.log('mysql connect successfully ');
        });
    }
}

//module.js
//module.exports = {a: 'a', b: 'b'}

//main.js
//var m = require('module.js');
//console.log(m.a);

//exports가 module.exports 객체를 참조한다
//require로 모듈(다른 js 파일 코드를) 불러온다
//require은 module.exports를 반환한다
