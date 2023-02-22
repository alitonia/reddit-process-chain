const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('ds-dt');
//
// db.exec(`
// ALTER TABLE comment_entity
// ADD batch TEXT;
// `.trim())
//

//
// db.all(`insert into raw
//         values ("t_1676886377078", 0),
//                ("t_1676135201301", 0),
//                ("t_1651163572425", 0),
//                ("t_1651163572421", 0)`, (x, y) => {
//     console.log(y)
// })

db.all('select * from raw', (x, y) => {
    console.log(y)
})
//
// db.all('delete from raw where id = "t_1677095982448"', (x, y) => {
//     console.log('preprocess', y)
// })
