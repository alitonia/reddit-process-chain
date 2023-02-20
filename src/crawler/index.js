const {
    makeDirIfNotExists,
    savePathToFile, getLast, isImageLink,
    extractImageName, isOuterPaperExtract, saveJSONData,
    getPaperHeadline, readTextFromImg, loadPaperNames
} = require("../shared/utils");
const path = require("path");
const url = require("url");
const {exec} = require("child_process");

let START_DATA_PATH = './data'
const TOPIC_PATH = './topic'
const LISTING_PATH = './listing'
const COMMENT_PATH = './comment'
const USER_PATH = './user'
const IMAGE_PATH = './image'
const IMAGE_TEXT_PATH = './image_text'
const PAPER_PATH = './paper'

const topics = [
    'politics', 'news', 'AskReddit',
    'technology', 'UpliftingNews', 'worldnews',
    'science', 'Showerthoughts', 'explainlikeimfive',
    'Futurology', 'WhitePeopleTwitter', 'funny', 'wholesomememes'

]
const BASE_URL = 'https:\/\/\/www.reddit.com'
const topicLimit = 10
const PAGINATION_LIMIT = 1
const BATCH_WRITE_LIMIT = 10

const runUser = true
const runImage = true
const runImageText = true
const runPaperHeadline = true

async function prepare({startDir}) {
    makeDirIfNotExists(START_DATA_PATH)
    if (startDir) {
        makeDirIfNotExists(path.join(START_DATA_PATH, startDir))
    }
    // makeDirIfNotExists(DATA_PATH + '_1')
}

async function crawling({startDir} = {}) {
    let DATA_PATH = startDir ? path.join(START_DATA_PATH, startDir) : START_DATA_PATH
    await prepare({startDir})

    let paperBatchWriteData = {}
    let paperPagination = 1
    const [savedIndex, existingPaperNames] = loadPaperNames()
    paperPagination = savedIndex

    let imageBatchWriteData = {}
    let imagePagination = 1

    for (const topic of topics) {
        let lastId = null
        let hasMore = true
        for (let i = 0; i < PAGINATION_LIMIT; i++) {
            if ((i > 0 && !lastId) || !hasMore) {
                if (!hasMore) {
                    console.log('No more')
                } else {
                    console.log('No more id')
                }
                break
            }

            console.log(`Topic: ${topic}, Pagination: ${i}`)
            let listingURL = `https://www.reddit.com/r/${topic}/.json?limit=${topicLimit}`
            if (lastId) {
                const urlObj = new URL(listingURL)
                urlObj.searchParams.set('after', lastId)
                listingURL = urlObj.href
            }
            const listing = await savePathToFile(
                listingURL,
                [DATA_PATH, TOPIC_PATH, topic, LISTING_PATH, i.toString().padStart(3, '0')],
            )
            if (!listing.data.children || listing.data.children.length === 0) {
                lastId = null
            } else {
                const lastChild = getLast(listing.data.children)
                lastId = lastChild.data.name
            }
            if (listing.data.dist < topicLimit) {
                hasMore = false
            }
            const extension = '.json'
            const topicShorts = listing.data.children.map(
                child => ({
                    link: (new URL(
                        child.data.permalink, BASE_URL
                    )).href + extension,
                    id: child.data.id,
                    author: child.data.author,
                    url: child.data.url,
                })
            )
            for (const short of topicShorts) {
                if (runUser) {
                    // const authorData = await savePathToFile(
                    //     (new URL(
                    //         `user/${short.author}/.json?limit=5`,
                    //         BASE_URL
                    //     )).href,
                    //     [
                    //         DATA_PATH,
                    //         USER_PATH,
                    //         short.author
                    //     ],
                    // )
                }
                if (short.url) {
                    if (runImage
                        && isImageLink(short.url)
                    ) {
                        const imageName = extractImageName(short.url)
                        const pathLevels = [
                            DATA_PATH,
                            IMAGE_PATH,
                            imageName
                        ]
                        const imgData = await savePathToFile(
                            short.url,
                            pathLevels,
                            'image'
                        )
                        if (runImageText) {
                            const interpretedText = await readTextFromImg(
                                short.url
                            )
                            console.log('Running', short.url, interpretedText)
                            imageBatchWriteData[short.url] = interpretedText
                            if (Object.keys(imageBatchWriteData).length > BATCH_WRITE_LIMIT) {
                                console.log('batch image writing', imagePagination)
                                saveJSONData(
                                    [DATA_PATH, IMAGE_TEXT_PATH, imagePagination.toString().padStart(5, '0')],
                                    imageBatchWriteData,
                                    'json'
                                )
                                imagePagination += 1
                                imageBatchWriteData = {}
                            }
                        }
                    } else if (runPaperHeadline
                        && isOuterPaperExtract(short.url)
                    ) {
                        if (!existingPaperNames.includes(short.url)) {
                            const headline = await getPaperHeadline(
                                short.url
                            )
                            paperBatchWriteData[short.url] = headline || {}
                            if (Object.keys(paperBatchWriteData).length > BATCH_WRITE_LIMIT) {
                                console.log('batch paper writing', paperPagination)
                                saveJSONData(
                                    [DATA_PATH, PAPER_PATH, paperPagination.toString().padStart(5, '0')],
                                    paperBatchWriteData,
                                    'json'
                                )
                                paperPagination += 1
                                paperBatchWriteData = {}
                            }
                        }
                    }
                }
                const comments = await savePathToFile(
                    short.link,
                    [
                        DATA_PATH,
                        TOPIC_PATH,
                        topic,
                        COMMENT_PATH,
                        short.id
                    ],
                )
                if (runUser) {
                    const commentAuthors = comments[1].data.children.map(
                        comment => comment.data.author
                    )
                    for (const commentAuthor of commentAuthors) {
                        if (!commentAuthor) {
                            continue
                        }
                        // const authorData = await savePathToFile(
                        //     (new URL(
                        //         `user/${commentAuthor}/.json?limit=3`,
                        //         BASE_URL
                        //     )).href,
                        //     [
                        //         DATA_PATH,
                        //         USER_PATH,
                        //         commentAuthor
                        //     ],
                        // )
                    }
                }
            }
        }
    }
    if (Object.keys(imageBatchWriteData).length) {
        console.log('batch image writing', imagePagination)
        saveJSONData(
            [DATA_PATH, IMAGE_TEXT_PATH, imagePagination.toString().padStart(5, '0')],
            imageBatchWriteData,
            'json'
        )
    }

    if (Object.keys(paperBatchWriteData).length) {
        console.log('batch paper writing', paperPagination)
        saveJSONData(
            [DATA_PATH, PAPER_PATH, paperPagination.toString().padStart(5, '0')],
            paperBatchWriteData,
            'json'
        )
    }
}

module.exports = {
    crawling
}
