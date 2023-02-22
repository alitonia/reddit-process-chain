const Koa = require('koa');
const views = require('koa-views');
const bodyParser = require('koa-bodyparser');

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('ds-dt');

const app = new Koa();
const options = {};

const globalStats = {}
app.use(bodyParser());
const mysql = require('mysql');
const {crawling} = require("../crawler");
const path = require("path");
const {preprocess} = require("../preprocess");
const {loadDataToDatabase} = require("../load");
const {predict} = require("../AI");
const {getDB} = require("../shared/utils");
const fs = require("fs");

const con = mysql.createConnection({
    host: "localhost",
    user: "hoang",
    password: "123456"
});
prepare()

const render = views(__dirname + '../../../views', {
    map: {
        html: 'bracket',
        // js: 'bracket',
        // css: 'bracket',
        // svg: 'bracket',
        // scss: 'bracket',
    }
})

// Must be used before any router is used
app.use(render)

// template
app.use(async (ctx, next) => {
    if (ctx.path.startsWith('/views/')) {
        try {
            return ctx.render(ctx.path.replace('/views/', '')).catch(x => {
                ctx.body = fs.readFileSync(
                    path.join(__dirname, '../../views', ctx.path.replace('/views/', '')),
                    {encoding: 'utf-8'}
                )
                if (ctx.path.endsWith('.css')) {
                    ctx.set('Content-Type', 'text/css')
                }
                if (ctx.path.endsWith('.js')) {
                    ctx.set('Content-Type', 'application/javascript')
                }
                if (ctx.path.endsWith('.ttf')) {
                    ctx.set('Content-Type', 'font/ttf')
                }
                if (ctx.path.endsWith('.woff2')) {
                    ctx.set('Content-Type', 'font/woff2')
                }
                if (ctx.path.endsWith('.svg')) {
                    ctx.set('Content-Type', 'image/svg+xml')
                }
            });
        } catch (e) {
            console.log(e)
            ctx.body = 'Not ok'
        }
    } else {
        return next()
    }
});

let i = 1

app.use(async (ctx, next) => {
    if (ctx.path === '/crawl') {
        return saveAbleProgress({
            ctx,
            next,
            urlPath: '/crawl',
            statNamespace: 'crawling',
            inUseMsg: 'Crawler already started',
            startMsg: 'Starts crawler',
            idNameFunc: () => `t_${(Date.now())}`,
            sqlTableName: 'raw',
            dataDirectory: 'rawData',
            action: crawling
        })
    } else {
        return next()
    }
});

app.use(async (ctx, next) => {
    if (ctx.path === '/preprocess') {
        const [error, nextRow] = await getDB('select * from raw where status = 0 limit 1', db)
        if (error) {
            return showError(ctx, error.message)
        }
        if (!nextRow) {
            return showInfo(ctx, 'Empty')
        }
        ctx.body = 'OK'
        const targetId = nextRow.id
        return saveAbleProgress({
            ctx,
            next,
            urlPath: '/preprocess',
            statNamespace: 'preprocess',
            inUseMsg: 'Preprocess already started',
            startMsg: 'Starts preprocessing',
            idNameFunc: () => targetId,
            sqlTableName: 'preprocess',
            dataDirectory: 'processed',
            action: preprocess,
            afterSuccess: () => {
                db.run(`update raw
                        set status = 1
                        where id = "${targetId}"`)
            }
        })
    } else {
        return next()
    }
});


app.use(async (ctx, next) => {
    if (ctx.path === '/load') {
        const [error, nextRow] = await getDB('select * from preprocess where status = 0 limit 1', db)
        if (error) {
            return showError(ctx, error.message)
        }
        if (!nextRow) {
            return showInfo(ctx, 'Empty')
        }
        const targetId = nextRow.id
        return saveAbleProgress({
            ctx,
            next,
            urlPath: '/load',
            statNamespace: 'load',
            inUseMsg: 'Loading already started',
            startMsg: 'Loads preprocessing',
            idNameFunc: () => targetId,
            sqlTableName: 'load',
            dataDirectory: 'load',
            action: loadDataToDatabase,
            afterSuccess: () => {
                db.run(`update preprocess
                        set status = 1
                        where id = "${targetId}"`)
            }
        })
    } else {
        return next()
    }
});


app.use(async (ctx, next) => {
    if (ctx.path === '/predict') {
        const [error, nextRow] = await getDB('select * from load where status = 0 limit 1', db)
        if (error) {
            return showError(ctx, error.message)
        }
        if (!nextRow) {
            return showInfo(ctx, 'Empty')
        }
        const targetId = nextRow.id
        return saveAbleProgress({
            ctx,
            next,
            urlPath: '/predict',
            statNamespace: 'predict',
            inUseMsg: 'Predicting already started',
            startMsg: 'Predicts starts',
            idNameFunc: () => targetId,
            sqlTableName: 'predict',
            dataDirectory: 'predict',
            action: predict,
            afterSuccess: () => {
                db.run(`update load
                        set status = 1
                        where id = "${targetId}"`)
            }
        })
    } else {
        return next()
    }
});

app.use(async (ctx, next) => {
    if (ctx.path === '/custom_query' && ctx.method === 'POST') {
        try {
            const query = ctx.request.body.query
            const result = await langInterpreter(query)
            console.log(result)
            ctx.body = {result}
        } catch (e) {
            showError(ctx, e.toString())
        }
    } else {
        return next()
    }
})
const PRC_DIR = './storedProcedure'
const procedurePath = []
if (fs.existsSync(PRC_DIR)) {
    const procedures = fs.readdirSync(PRC_DIR)
    procedures.forEach(procedure => procedurePath.push(path.join('/query', procedure)))
}

app.use(async (ctx, next) => {
    console.log(procedurePath)
    if (procedurePath.includes(ctx.path) && ctx.method === 'POST') {
        try {
            const splitted = ctx.path.split('/')
            const ident = splitted[splitted.length - 1]
            const variables = ctx.request.body.variables || {}
            const sqlTemplatePath = (path.join(PRC_DIR, ident, 'query.liquid.sql'))
            const sqlTemplate = fs.existsSync(sqlTemplatePath) ?
                fs.readFileSync(path.join(PRC_DIR, ident, 'query.liquid.sql'), {encoding: 'utf-8'}) :
                ''
            const nodeTemplatePath = path.join(PRC_DIR, ident, 'process.liquid.js')
            const nodeTemplate = fs.existsSync(nodeTemplatePath) ?
                fs.readFileSync(path.join(PRC_DIR, ident, 'process.liquid.js'), {encoding: 'utf-8'}) :
                ''
            const procedures = []
            if (sqlTemplate) {
                procedures.push(
                    {"lang": "sql", "text": replaceVar(sqlTemplate, variables)}
                )
            }
            if (nodeTemplate) {
                procedures.push(
                    {"lang": "js", "text": replaceVar(nodeTemplate, variables)}
                )
            }
            console.log(procedures)
            ctx.body = await langInterpreter(procedures)
        } catch (e) {
            showError(ctx, e.toString())
        }
    } else {
        return next()
    }
})

function replaceVar(text, vars) {
    return Object.entries(vars).reduce((str, [varName, val]) => {
        return str.replace(new RegExp(`{{ *${varName} *}}`, 'g'), val)
    }, text).replace(new RegExp(`{{ *[\\w_]+ *}}`, 'g'), '')
}

//
// app.use(async ctx => {
//     ctx.body = 'Default';
// });


app.listen(3000);


async function langInterpreter(langList) {
    let result = null
    for (const langListElement of langList) {
        result = await langHandler(langListElement, result)
    }
    return result
}

async function langHandler(langObj, lastResult) {
    switch (langObj.lang) {
        case 'sql': {
            return sqlHandler(langObj.text)
        }
        case 'js': {
            return jsHandler(langObj.text, lastResult)
        }
        default:
            return lastResult
    }
}

async function jsHandler(text, lastResult) {
    try {
        const prependText = `const data = ${JSON.stringify(lastResult)}`
        const result = (new Function([prependText, text].join('; ')))()
        console.log(result)
        return result
    } catch (e) {
        console.warn(e)
        return lastResult
    }
}

async function sqlHandler(sqlText) {
    if (sqlText.toLowerCase().includes('select') &&
        !sqlText.toLowerCase().includes('limit') &&
        !sqlText.toLowerCase().includes('average_comment_length')
    ) {
        sqlText = sqlText.replace(/[;\s]+$/g, '') + ' LIMIT 10'
    }
    console.log(sqlText)
    return new Promise(resolve => {
        db.all(sqlText, (error, val) => {
            console.log(val)
            if (error) {
                console.log(error)
            }
            resolve(val)
        })
    })
}

function prepare() {
    // try {
    //     con.connect(function (err) {
    //         if (err) throw err;
    //         console.log("Connected!");
    //     });
    // } catch (e) {
    //     console.log(e)
    // }
    console.log('OK')
    // db.exec('drop table comment_entity')
    // db.exec('drop table comments')
    // db.exec('drop table load')
    // db.exec('drop table predict_;val')
    // db.exec('update load set status = 0 where id ="t_1676135201301"')
    // db.exec('update preprocess set status = 0 where id ="t_1676135201301"')

    db.exec("CREATE TABLE If not exists raw (id TEXT, status INT)");
    db.exec("CREATE TABLE If not exists preprocess (id TEXT, status INT)");
    db.exec("CREATE TABLE If not exists load (id TEXT, status INT)");
    db.exec("CREATE TABLE If not exists predict (id TEXT, status INT)");
    db.exec(`CREATE TABLE If not exists comments
             (
                 id
                 TEXT,
                 body
                 TEXT,
                 subreddit
                 TEXT,
                 author
                 TEXT,
                 created_utc
                 TEXT,
                 parent_id
                 TEXT,
                 subreddit_type
                 TEXT,
                 controversiality
                 INT,
                 depth
                 INT,
                 ups
                 INT,
                 downs
                 INT,
                 total_awards_received
                 INT,
                 batch
                 TEXT
             )`)
    db.exec(`CREATE TABLE If not exists comment_entity
             (
                 id
                 TEXT,
                 count
                 INT,
                 batch
                 TEXT
             )`)
    db.exec(`CREATE TABLE If not exists predict_val
             (
                 id
                 TEXT
                 PRIMARY
                 KEY,
                 nb
                 TEXT,
                 lr
                 TEXT
             )`)

    // db.exec('insert into raw values("St", 1)')
    // db.exec('insert into raw values("t_1676135201301", 0)')
    // db.exec('delete from comments')

    db.get('select * from raw', (x, y) => {
        console.log('raw', y)
    })
    db.get('select * from preprocess', (x, y) => {
        console.log('preprocess', y)
    })
    db.get('select * from load', (x, y) => {
        console.log('load', y)
    })
    db.get('select * from comments', (x, y) => {
        console.log('comments', y)
    })
    db.get('select * from comment_entity', (x, y) => {
        console.log('comment_entity', y)
    })
    db.get('select * from predict', (x, y) => {
        console.log('predict', y)
    })
    db.get('select * from predict_val', (x, y) => {
        console.log('predict_val', y)
    })
    const utils = [showError, showInfo]
    // utils.forEach(util => ctx[util.name] = util)
    // next()
}

function showError(ctx, msg) {
    console.warn(msg)
    return showInfo(ctx, msg)
}

function showInfo(ctx, msg) {
    ctx.body = makeMessage(msg)
}

function makeMessage(str) {
    return JSON.stringify({message: str})
}

async function saveAbleProgress(
    {
        ctx,
        urlPath,
        statNamespace,
        inUseMsg,
        startMsg,
        idNameFunc,
        sqlTableName,
        dataDirectory,
        action,
        afterSuccess
    }
) {
    if (ctx.path === urlPath) {
        if (globalStats[statNamespace]) {
            return showInfo(ctx, inUseMsg)
        }
        const distinctName = idNameFunc()

        const stmt = db.prepare(`INSERT INTO ${sqlTableName}
                                 VALUES (?, ?)`);
        stmt.run(distinctName, 0);
        stmt.finalize();

        action({
            startDir: path.join(dataDirectory, distinctName),
            db
        }).then(() => {
            console.log('done')
            globalStats[statNamespace] = false
            if (afterSuccess) {
                afterSuccess()
            }
        })
        globalStats[statNamespace] = true
        return showInfo(ctx, startMsg)
    }
}
