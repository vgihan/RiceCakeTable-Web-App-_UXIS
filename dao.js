const db = require(__dirname + '/mysql.js');
const connection = db.init();
db.connect(connection);

const dto = require(__dirname + '/dto.js');

module.exports = { 
    readAll: function(result) {
        rows = connection.query('select * from test');
        return rows;   
    },

    write: function() {
        var id = dto.getID();
        var room = dto.getRoom();
        var name = dto.getName();
        var sql = 'insert into test(id,name,room_id) values(?,?,?)';
        connection.query(sql, [id,name,room], function(error,rows,fields){
            if(error) console.log("query error : " + error);
        });
        return 1;
    },
    
    update: function() {
        var id = dto.getID();
        var room = dto.getRoom();
        var name = dto.getName();
        var sql = 'update test set name=?, room_id=? where id=?';
        connection.query(sql, [name,room,id], function(error,rows,fields){
            if(error) console.log("query error : " + error);
        });
        return 1;
    },

    delete: function() {
        var id = dto.getID();
        var sql = 'delete from test where id = ?';

        connection.query(sql, id, function(error,rows,fields){
            if(error) console.log("query error : " + error);
        });
        return 1;
    }
}