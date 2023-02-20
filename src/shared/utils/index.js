const fs = require('fs')
const path = require('path');
const HTMLParser = require('node-html-parser');
const Tesseract = require('tesseract.js');

const DEFAULT_FILE_SETTINGS = {
    mode: 0o744,
    encoding: 'utf8',
    recursive: true
}

const globalConfig = {
    last: 1
}

function getLast(arr) {
    return arr[arr.length - 1]
}

const superSleep = {
    cur: 1
}

async function sleep(count = .1) {
    const isSpecial = superSleep.cur % 17 === 0

    if (isSpecial) {
        const sleepTime = count * 1000 * Math.random()
        return new Promise((resolve) => {
            setTimeout(() => {
                    superSleep.cur += 1
                    resolve()
                }, sleepTime
            )
        })
    } else {
        return null
    }
}

function makeDirIfNotExists(dirname) {
    const dir = path.resolve(dirname);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, DEFAULT_FILE_SETTINGS)
    }
}

async function getNetworkIgnoreError(
    link,
    config = {},
    format = 'json',
    allowError = false
) {
    try {
        if ((
                globalConfig.last +
                1000 * (1 + Math.random().toFixed(1))
            ) >= Date.now() &&
            link.includes('reddit')
        ) {
            await sleep();
        }
        globalConfig.last = Date.now()
        const dataObj = await fetch(link, config)
        let data = await (
            format === 'json' ? dataObj.json() : (
                format === 'text' ? dataObj.text() : dataObj.arrayBuffer()
            )
        )
        if (format === 'image') {
            data = Buffer.from(data)
        }
        if (data && !data.error) {
            console.log(`Got ${link}`)
            return data
        } else {
            console.log((`Failed ${link}`))
            console.log(data)
            if (allowError) {
                return data
            } else {
                return null
            }
        }
    } catch (e) {
        console.warn(e)
        return null
    }
}

function saveJSONData(pathLevel, data, format) {
    let realPath = path.join(...pathLevel)
    if (!realPath) {
        console.log(('Empty path'))
        return null;
    }
    if (format === 'json' &&
        !realPath.endsWith('.json')
    ) {
        realPath += '.json'
    }
    if (pathLevel.length > 1) {
        const folderPath = path.join(...pathLevel.slice(
            0, pathLevel.length - 1
        ))
        if (!fs.existsSync(folderPath)) {
            makeDirIfNotExists(folderPath)
        }
    }
    fs.writeFileSync(
        realPath,
        format === 'json' ? JSON.stringify(data) : data,
        format === 'image' ? {} : DEFAULT_FILE_SETTINGS
    )
    // console.log((`Created file ${realPath}`))
}

async function savePathToFile(link, pathLevels, format = 'json') {
    let realPath = path.join(...pathLevels)
    if (!realPath.endsWith('.json')) {
        realPath += '.json'
    }
    if (fs.existsSync(realPath)) {
        // console.log((`File existed: ${realPath}`))
        if (format === 'json') {
            return JSON.parse(
                fs.readFileSync(realPath, DEFAULT_FILE_SETTINGS)
            );
        } else {
            return (
                fs.readFileSync(realPath)
            )
        }
    }
    const data = await getNetworkIgnoreError(
        link,
        {},
        format,
        true
    )
    if (!data) {
        console.warn('Missing data')
        return null
    }
    if (data.error) {
        console.warn(JSON.stringify(data))
        if (format !== 'json') {
            return null
        }
    }
    saveJSONData(pathLevels, data, format)
    return data
}

const imageExtensionList = ['png', 'jpg', 'jpeg']

function isImageLink(link) {
    return imageExtensionList.some(ext => link.endsWith(ext))
}

function extractImageName(link) {
    const urlObj = new URL(link)
    return urlObj.pathname.replace('/', '')
}

function isOuterPaperExtract(link) {
    try {
        if (!link.startsWith('http')) {
            return false
        }
        const urlObj = new URL(link)
        if (urlObj.pathname.includes('.')) {
            return false
        }
        const hostName = urlObj.hostname
        const niceName = hostName.replace('.', '')
        return !niceName.includes('reddit')
    } catch (e) {
        console.warn(link, e)
        return false
    }
}

async function getPaperHeadline(link) {
    const rawHTML = await getNetworkIgnoreError(
        link,
        {},
        'text'
    )
    if (rawHTML) {
        const htmlTree = HTMLParser.parse(rawHTML)
        const title = htmlTree.querySelector('title, header, h1')
        const description = htmlTree.querySelector('meta[name="description"]')
        return {
            title: (title ? title.innerText : "") || "",
            description: (description ? description.attributes.content : "") || ""
        }
    }
    return null
}

async function readTextFromImg(link) {
    return Tesseract.recognize(link, 'eng')
        .then(({data: {text}}) => {
            return text
        })
}

function loadPaperNames() {
    let data = []
    let i = 1
    let nextIndex = null;
    for (; i < 99999; i++) {
        const filePath = `./data/paper/${i.toString().padStart(5, '0')}.json`
        if (fs.existsSync(filePath)) {
            const fileData = fs.readFileSync(filePath, DEFAULT_FILE_SETTINGS)
            if (fileData) {
                const localKeys = Object.keys(JSON.parse(fileData))
                data = data.concat(
                    localKeys
                )
            }
        } else {
            nextIndex = i
            break
        }
    }
    return [nextIndex, data]
}


async function getDB(sql, db) {
    const [error, nextRow] = await (new Promise((resolve) => {
        db.get(sql, (x, y) => {
            console.log(x, y)
            resolve([x, y])
        })
    }))
    return [error, nextRow]
}

module.exports = {
    sleep,
    makeDirIfNotExists,
    getNetworkIgnoreError,
    saveJSONData,
    savePathToFile,
    getLast,
    isImageLink,
    extractImageName,
    isOuterPaperExtract,
    getPaperHeadline,
    readTextFromImg,
    loadPaperNames,
    getDB
}
