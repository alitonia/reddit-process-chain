const {naiveBayesPredict, logisticRegressPredict} = require("./sentiment/external");

async function predict({db}) {
    const entries = []
    db.all("SELECT id, body FROM comments", async (err, entries) => {
        console.log(entries)
        for (const entry of entries) {
            const nbPredict = (await naiveBayesPredict(entry.body) || "").replaceAll(`"`, '')
            const lrPredict = (await logisticRegressPredict(entry.body) || '').replaceAll(`"`, '')
            console.log(entry.body, nbPredict, lrPredict)
            db.exec(`INSERT into predict_val values("${entry.id}","${nbPredict}", "${lrPredict}") on conflict(id) do update set nb="${nbPredict}", lr="${lrPredict}"`)
        }
    });
}

module.exports = {
    predict
}
