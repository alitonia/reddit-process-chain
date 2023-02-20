const {makeDirIfNotExists} = require("../shared/utils");
const path = require("path");
const fs = require("fs");
const START_DATA_PATH = './data'

async function load({db, startDir}) {
    const split = startDir.split('/')
    const id = split[split.length - 1]

    const workingDataDir = path.join(START_DATA_PATH, 'processed', id)
    const commentObj = JSON.parse(
        fs.readFileSync(
            path.join(workingDataDir, 'raw_comment.json'),
            {encoding: 'utf-8'}
        )
    )
    let stmt = db.prepare(`INSERT INTO comments VALUES (${Array(13).fill('?').join(',')})`);
    commentObj.forEach(comment => {
        stmt.run(
            comment.id,
            comment.body,
            comment.subreddit,
            comment.author,
            comment.created_utc,
            comment.parent_id,
            comment.subreddit_type,
            comment.controversiality,
            comment.depth,
            comment.ups,
            comment.downs,
            comment.total_awards_received,
            id
        )
    })
    stmt.finalize();
    console.log(workingDataDir, 'inserted', commentObj.length)

    const entityObj = JSON.parse(
        fs.readFileSync(
            path.join(workingDataDir, 'entities.json'),
            {encoding: 'utf-8'}
        )
    )
    db.exec('select count(*) from comments', (err, val) => console.log('c', err, val))

    entityObj.forEach(entity => {
        db.get(`select * from comment_entity where id = "${entity.id}" limit 1`, (error, val) => {
            if (val) {
                db.exec(`update comment_entity set count = count + ${entity.count} where id = "${entity.id}"`)
            } else {
                const stt = `insert into comment_entity values("${entity.id}", ${entity.count})`
                db.exec(stt, (error) => error && console.log(error, stt))
            }
        })
    })
    db.exec('select count(*) from comment_entity', (err, val) => console.log('ce', err, val))
    console.log('done')
}

module.exports = {
    loadDataToDatabase: load
}
