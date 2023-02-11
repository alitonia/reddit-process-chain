const Koa = require('koa');
const views = require('koa-views');
const bodyParser = require('koa-bodyparser');
const app = new Koa();
const options = {};
app.use(bodyParser());

const render = views(__dirname + '/views', {extension: 'bracket'})

// Must be used before any router is used
app.use(render)

// template
app.use(async (ctx, next) => {
    console.log(ctx.path)
    if (ctx.path.startsWith('/views/')) {
        return ctx.render(ctx.path.replace(/\/views\//, ''));
    }
    return next()
});

app.use(async ctx => {
    ctx.body = 'Hello World';
});

app.listen(3000);
