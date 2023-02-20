// dangerous! Use with care
const fs = require("fs");
const paperFolder = './data/paper/'
const getPaperPathFromIndex = (index) => `${paperFolder}${index.toString().padStart(5, '0')}.json`

function condensedPaper() {
    const data = {}
    let lastOldIndex = 1
    for (let i = 1; i < 99999; i++) {
        const filePath = getPaperPathFromIndex(i)
        if (fs.existsSync(filePath)) {
            lastOldIndex = i
            const sectionJson = JSON.parse(fs.readFileSync(filePath, {encoding: 'utf-8'}))
            Object.keys(sectionJson).forEach(
                key => data[key] = sectionJson[key]
            )
        } else {
            break
        }
    }
    let dataKeys = Object.keys(data)
    const dataLength = Object.keys(data).length

    console.log('Length', dataLength)
    let i = 0
    for (; i < 99999; i++) {
        if (dataKeys.length === 0) {
            break
        }
        const nextKeys = dataKeys.slice(0, 100)
        dataKeys = dataKeys.slice(100)
        console.log(i + 1, nextKeys.length)

        const obj = {}
        nextKeys.forEach(key => obj[key] = data[key])
        fs.writeFileSync(
            getPaperPathFromIndex(i + 1),
            JSON.stringify(obj),
            {encoding: 'utf-8'}
        )
    }
    for (let j = i + 1; j <= lastOldIndex; j++) {
        const name = getPaperPathFromIndex(j)
        console.log('delete', name)
        fs.unlinkSync(
            name
        )
    }
}

condensedPaper()
