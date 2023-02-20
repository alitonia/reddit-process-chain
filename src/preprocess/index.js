const path = require("path");
const url = require("url");
const {exec} = require("child_process");
const {makeDirIfNotExists} = require("../shared/utils");
const fs = require("fs");
const {normalizeText, normalizeName} = require("normalize-text");
const nameToEmojiMap = require("emoji-name-map");
const removeMd = require('remove-markdown');
const accents = require('remove-accents');
const {removeStopwords, eng} = require('stopword')
const {StemmerEn} = require('@nlpjs/lang-en');
const ner = require('wink-ner');
const nlp = require('compromise/three')
// Create your instance of wink ner & use default config.
const stemmer = new StemmerEn();
const emojiToNameMap = Object.entries(nameToEmojiMap.emoji).reduce((acc, [name, emoji]) => {
    acc[emoji] = name.split('_').filter(Boolean).join(' ')
    return acc
}, {
    ':D': 'happy',
    ':-)': 'happy',
    ':)': "smile",
    '(:': "smile",
    ':))': "smile",
})
const entities = {}

let START_DATA_PATH = './data'
const RAW_COMMENT = 'raw_comment'

async function prepare({startDir}) {
    makeDirIfNotExists(START_DATA_PATH)
    if (startDir) {
        makeDirIfNotExists(path.join(START_DATA_PATH, startDir))
        // makeDirIfNotExists(path.join(START_DATA_PATH, startDir))
    }
    // makeDirIfNotExists(DATA_PATH + '_1')
}

function extract(obj, attrs) {
    const newObj = {}
    attrs.forEach(attr => {
        newObj[attr] = obj[attr]
    })
    return newObj
}

function replaceEmoji(text) {
    return Object.entries(emojiToNameMap).reduce(
        (text, [emoji, phrase]) => {
            return text.replaceAll(emoji, ` ${phrase} `)
        }, text)
}

function removeUnicode(str) {
    return str.replace(/[^\x00-\x7F]/g, "")
}

function removeOthers(str) {
    const list = [
        '&amp;', '&#x200b;', '#x200b;', '&gt;',
        /((http|ftp|https):\/\/)?([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])?/g,
    ]
    return list.reduce(
        (text, t) => {
            return text.replaceAll(t, '')
        }, str)
}

function removeStopwordsAdapter(text) {
    return removeStopwords(text.split(/\s+/), eng).join(' ')
}

function stemming(text) {
    return stemmer.tokenizeAndStem(text).join(' ')
}

let i = 0

function extractEntity(text) {
    let doc = nlp(text)
    let list = doc.topics().normalize().json()
    list.forEach(entry => {
        const entryName = normalizeName(entry.text)
        if (!entities[entryName]) {
            entities[entryName] = 1
        } else {
            entities[entryName] += 1
        }
        if (i < 100) {
            console.log(entryName)
            i++
        }
    })
    return text
}

function processComment(comment) {
    const engines = [
        removeMd, removeOthers,
        replaceEmoji, removeUnicode,
        accents.remove, extractEntity,
        removeStopwordsAdapter, stemming,
        normalizeText
    ]
    return engines.reduce((text, func) => func(text), comment)
}

async function preprocess({startDir}) {
    let DATA_PATH = startDir ? path.join(START_DATA_PATH, startDir) : START_DATA_PATH
    await prepare({startDir})
    const split = startDir.split('/')
    const id = split[split.length - 1]
    console.log(path.join(START_DATA_PATH, 'rawData', id))

    let comments = []
    const commentId = {}
    const allFilePath = []
    if (fs.existsSync(path.join(START_DATA_PATH, 'rawData', id))) {
        if (fs.existsSync(path.join(
            START_DATA_PATH, 'rawData', id, 'topic'
        ))) {
            const commentFolders = fs.readdirSync(path.join(
                START_DATA_PATH, 'rawData', id, 'topic'
            )).map(x => path.join(START_DATA_PATH, 'rawData', id, 'topic', x, 'comment'));

            commentFolders.forEach(commentFolder => {
                const filePaths = fs.readdirSync(path.join(
                    commentFolder
                )).map(x => path.join(commentFolder, x))

                filePaths.forEach(filePath => {
                    allFilePath.push([filePath, 0])
                })
            })
        }

        if (fs.existsSync(path.join(
            START_DATA_PATH, 'rawData', id, 'user'
        ))) {
            const userFiles = fs.readdirSync(path.join(
                START_DATA_PATH, 'rawData', id, 'user'
            )).map(x => path.join(START_DATA_PATH, 'rawData', id, 'user', x));

            userFiles.forEach(filePath => {
                allFilePath.push([filePath, 1])
            })
        }

        allFilePath.forEach(([filePath, type]) => {
            const file = fs.readFileSync(filePath, {encoding: 'utf-8', flag: 'r'})
            try {
                const obj = JSON.parse(file)
                let list = type === 0 ? obj[1].data.children : obj.data.children

                for (let i = 0; i < 10 ** 8; i++) {
                    const comment = list.pop()
                    if (list.length === 0) {
                        break
                    }
                    if (comment && comment.kind !== 'more') {
                        const brief = extract(
                            comment.data,
                            [
                                'subreddit',
                                'id',
                                'author',
                                'created_utc',
                                'parent_id',
                                'body',
                                'subreddit_type',
                                'controversiality',
                                'depth',
                                'ups',
                                'downs',
                                'total_awards_received'
                            ]
                        )
                        if (commentId[brief.id]) {
                            continue
                        }
                        if (brief.body) {
                            brief.body = processComment(brief.body)
                            comments.push(brief)
                        }
                        if (comment.data.replies &&
                            comment.data.replies.data &&
                            comment.data.replies.data.children &&
                            comment.data.replies.data.children.length) {
                            list = list.concat(comment.data.replies.data.children)
                        }
                    }
                }
            } catch (e) {
                console.log(e)
            }
            // console.log('file', filePath, comments.length)
        })

        const arrayLikeEntries = Object.entries(entities).map(([name, count]) => {
            return {id: name, count: count}
        })
        fs.writeFileSync(
            path.join(START_DATA_PATH, startDir, RAW_COMMENT + '.json'),
            JSON.stringify(comments),
            {encoding: 'utf-8', flag: 'w+'}
        )
        fs.writeFileSync(
            path.join(START_DATA_PATH, startDir, 'entities' + '.json'),
            JSON.stringify(arrayLikeEntries),
            {encoding: 'utf-8', flag: 'w+'}
        )
        console.log('Total', comments.length)
    } else {
        console.log('Undefined behaviour')
    }

}

module.exports = {
    preprocess
}
