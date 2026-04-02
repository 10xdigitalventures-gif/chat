const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('c:/Users/User/Downloads/TenXConvo_v7_with_EasyPaisa/TenXConvo_output/tenxconvo_v2/src/tenxconvo.api/tenxconvo_dev.db');
db.all('SELECT Id, UserName, Email, LoginId, IsActive, RoleId FROM Users', (err, rows) => { 
    if(err) console.error(err); 
    else console.log(JSON.stringify(rows, null, 2)); 
    db.close(); 
});
