const providerURL = 'http://127.0.0.1:8000'

async function apiPredict(text, model) {
    return fetch(`${providerURL}/ml/${model}?q=${text}`).then(x => x.text()).then(x => {
        return x
    }).catch(e => console.warn(e))
}

async function naiveBayesPredict(text) {
    return apiPredict(text, 'nb')
}

async function logisticRegressPredict(text) {
    return apiPredict(text, 'lr')
}

module.exports = {
    naiveBayesPredict,
    logisticRegressPredict
}
