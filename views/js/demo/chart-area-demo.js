// Set new default font family and font color to mimic Bootstrap's default styling
Chart.defaults.global.defaultFontFamily = 'Nunito', '-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
Chart.defaults.global.defaultFontColor = '#858796';

function number_format(number, decimals, dec_point, thousands_sep) {
    // *     example: number_format(1234.56, 2, ',', ' ');
    // *     return: '1 234,56'
    number = (number + '').replace(',', '').replace(' ', '');
    var n = !isFinite(+number) ? 0 : +number,
        prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
        sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep,
        dec = (typeof dec_point === 'undefined') ? '.' : dec_point,
        s = '',
        toFixedFix = function (n, prec) {
            var k = Math.pow(10, prec);
            return '' + Math.round(n * k) / k;
        };
    // Fix for IE parseFloat(0.55).toFixed(0) = 0;
    s = (prec ? toFixedFix(n, prec) : '' + Math.round(n)).split('.');
    if (s[0].length > 3) {
        s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
    }
    if ((s[1] || '').length < prec) {
        s[1] = s[1] || '';
        s[1] += new Array(prec - s[1].length + 1).join('0');
    }
    return s.join(dec);
}

// Area Chart Example
var ctx = document.getElementById("myAreaChart");
// var myLineChart = new Chart(ctx, {
//     type: 'line',
//     data: {
//         labels: ["Jen", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
//         datasets: [{
//             label: "Earnings",
//             lineTension: 0.3,
//             backgroundColor: "rgba(78, 115, 223, 0.05)",
//             borderColor: "rgba(78, 115, 223, 1)",
//             pointRadius: 3,
//             pointBackgroundColor: "rgba(78, 115, 223, 1)",
//             pointBorderColor: "rgba(78, 115, 223, 1)",
//             pointHoverRadius: 3,
//             pointHoverBackgroundColor: "rgba(78, 115, 223, 1)",
//             pointHoverBorderColor: "rgba(78, 115, 223, 1)",
//             pointHitRadius: 10,
//             pointBorderWidth: 2,
//             data: [0, 10000, 5000, 15000, 10000, 20000, 15000, 25000, 20000, 30000, 25000, 40000],
//         }],
//     },
//     options: {
//         maintainAspectRatio: false,
//         layout: {
//             padding: {
//                 left: 10,
//                 right: 25,
//                 top: 25,
//                 bottom: 0
//             }
//         },
//         scales: {
//             xAxes: [{
//                 time: {
//                     unit: 'date'
//                 },
//                 gridLines: {
//                     display: false,
//                     drawBorder: false
//                 },
//                 ticks: {
//                     maxTicksLimit: 7
//                 }
//             }],
//             yAxes: [{
//                 ticks: {
//                     maxTicksLimit: 5,
//                     padding: 10,
//                     // Include a dollar sign in the ticks
//                     callback: function (value, index, values) {
//                         return '$' + number_format(value);
//                     }
//                 },
//                 gridLines: {
//                     color: "rgb(234, 236, 244)",
//                     zeroLineColor: "rgb(234, 236, 244)",
//                     drawBorder: false,
//                     borderDash: [2],
//                     zeroLineBorderDash: [2]
//                 }
//             }],
//         },
//         legend: {
//             display: false
//         },
//         tooltips: {
//             backgroundColor: "rgb(255,255,255)",
//             bodyFontColor: "#858796",
//             titleMarginBottom: 10,
//             titleFontColor: '#6e707e',
//             titleFontSize: 14,
//             borderColor: '#dddfeb',
//             borderWidth: 1,
//             xPadding: 15,
//             yPadding: 15,
//             displayColors: false,
//             intersect: false,
//             mode: 'index',
//             caretPadding: 10,
//             callbacks: {
//                 label: function (tooltipItem, chart) {
//                     var datasetLabel = chart.datasets[tooltipItem.datasetIndex].label || '';
//                     return datasetLabel + ': $' + number_format(tooltipItem.yLabel);
//                 }
//             }
//         }
//     }
// });

var ctx1 = ctx
var ctn = document.querySelector('.chart-area')

function capitalize(name) {
    return name.charAt(0).toUpperCase() + name.slice(1)
}

function convert(name) {
    const upperCaseIndex = name.split('').map((c, i) => (c === c.toUpperCase() ? i : -1)).filter(x => x !== -1)
    const seg = []
    let last = 0
    for (let i = 0; i < upperCaseIndex.length + 1; i++) {
        seg.push((name.slice(last, upperCaseIndex[i])).toLowerCase())
        last = upperCaseIndex[i]
    }

    return capitalize(seg.join(' '))
}

const reportTypes = [
    'preview', 'commentStats', 'wordCloud',
    'commentLengthDistribution', 'lengthVsUpvote',
    'subredditDistribution'
]

const defaultType = reportTypes[5]


const varMap = {
    [reportTypes[0]]: {
        "group_by": "group by length(body)",
        "table": "comments",
        "limit": 30
    }
}

const chartMap = {
    [reportTypes[2]]: drawCloud,
    [reportTypes[3]]: drawLine,
    [reportTypes[4]]: drawPoints,
    [reportTypes[5]]: drawPie,

}

const timeSelector = document.querySelector('.time-selector')

function drawPie(_data) {
    makeCanvas()
    const data = _data.sort((y, x) => {
        return x.total - y.total
    }).slice(1-1, 111)
    const labels = data.map(t => t.subreddit)
    const counts = data.map(t => t.total)

    var xValues = ["Italy", 1, "Spain", "USA", "Argentina"];
    var yValues = [55, 49, 44, 24, 15];
    var barColors = [
        "#b91d47",
        "#00aba9",
        "#2b5797",
        "#e8c3b9",
        "#1e7145"
    ];

    new Chart(ctx1, {
        type: "pie",
        data: {
            labels: labels,
            datasets: [{
                backgroundColor: counts.map(randomColor),
                data: counts
            }]
        },

    });
    return;

    console.log(labels, counts)
    new Chart(ctx1, {
        type: 'pie',
        labels: labels,
        data: {
            datasets: [{
                data: counts,
                backgroundColor: labels.map(randomColor)
                // borderColor: randomColor(),
                // backgroundColor: colors
            }]
        }
    })
}

function drawPoints(data) {
    makeCanvas()
    const val = data.map(t => {
        return {
            x: t.c_length,
            y: t.ups
        }
    })
    new Chart(ctx1, {
        type: 'scatter',
        data: {
            datasets: [{
                data: val,
                pointRadius: 4,
                pointBackgroundColor: randomColor()
                // borderColor: randomColor(),
                // backgroundColor: colors
            }]
        }
    })
}

function drawLine(data) {
    makeCanvas()
    const xValues = data.map(t => t.c_length)
    const yValues = data.map(t => t.total)

    new Chart(ctx1, {
        type: 'line',
        data: {
            labels: xValues,
            datasets: [{
                data: yValues,
                borderColor: randomColor(),
                // backgroundColor: colors
            }]
        }
    })
}

function showLoading() {


}

function hideLoading() {

}

function drawBarChart(data) {
    makeCanvas()

    const xValues = Object.keys(data)
    const yValues = Object.values(data)
    const colors = [...Array(xValues.length)].map(randomColor)
    new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: xValues,
            datasets: [{
                data: yValues,
                backgroundColor: colors
            }]
        }
    })
}

function clearCanvas() {
    ctn.innerHTML = ""
}

function drawTable(data) {
    makeCtn()
    const fieldNames = Object.keys(data[0])
    ctx1.innerHTML = `
    <table id="table_id" class="display">
    <thead>
        <tr>
        ${fieldNames.map(name => `<th>${name.slice(0, 5)}</th>`).join('')}
        </tr>
    </thead>
    <tbody>
            ${data.map(entry => '<tr>' + Object.values(entry).map(x => `<th class="tooltip1">${typeof x === 'string' ? x.slice(0, 13) : x}   <span class="tooltiptext">${x}</span></th>`).join('') + '</tr>').join('')}
    </tbody>
</table>`.trim()
    $('#table_id').DataTable();
}

function makeCtn() {
    clearCanvas()

    if (!document.querySelector('.chart-area.chart-1 #myArea')) {
        document.querySelector('.chart-1').innerHTML = `
        <div id="myArea"></div>
        `.trim()
        ctx1 = document.querySelector('.chart-area.chart-1 #myArea')
    }
}

function makeCanvas() {
    clearCanvas()

    if (!document.querySelector('.chart-area.chart-1 #myAreaChart')) {
        document.querySelector('.chart-1').innerHTML = `
        <canvas id="myAreaChart" style="width: 100%" ></canvas>
        `.trim()
    }
    ctx1 = document.querySelector('.chart-area.chart-1 #myAreaChart')
    const scale = window.devicePixelRatio;
    console.log(scale)
    // ctx1.getContext('2d').scale(scale, scale);
}

function drawCloud(data) {
    makeCanvas()
    const tObj = data.map(entry => [entry.id, entry.total])
    console.log(WordCloud, tObj)
    WordCloud(ctx1, {
        list: tObj,
        shrinkToFit: true,
        drawOutOfBound: false,
        shuffle: true,
        rotateRatio: 0.5,
        rotationSteps: 2,
    })
}

function drawGraph(data, type) {
    if (chartMap[type]) {
        chartMap[type](data)
    } else if (data instanceof Object && !(data instanceof Array)) {
        drawBarChart(data)
    } else {
        drawTable(data)
    }
}

let currentType = null

async function handleChoice(type) {
    currentType = type
    document.querySelector('.graph-title').innerHTML = convert(type)

    showLoading()
    console.log(timeSelector.value)
    const vars = varMap[type] || {}
    if (timeSelector.value) {
        vars.filter = `where batch like "%${timeSelector.value}"`
    }
    const data = await fetch('/query/' + type, {
        headers: {
            'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify({
            variables: vars
        })
    }).then(x => x.json())
    drawGraph(data, type)

    hideLoading()
}


const target = document.querySelector('#super-charge-selector')
reportTypes.forEach(function (type) {
    const e = document.createElement('a')
    e.classList.add('dropdown-item')
    e.value = type
    e.innerText = convert(type)
    e.onclick = function () {
        handleChoice(type)
    }
    target.appendChild(e)
})

handleChoice(defaultType)

function randomColor() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
}

fetch('/query/' + 'batchList', {
    headers: {
        'Content-Type': 'application/json'
    },
    method: 'POST',
    body: JSON.stringify({})
}).then(x => x.json())
    .then(nums => {
        nums.forEach(num => {
            const el = document.createElement("option")
            el.value = num
            el.innerText = (new Date(parseInt(num))).toDateString()
            timeSelector.appendChild(el)
        })
    })
timeSelector.onchange = function () {
    console.log(currentType)
    handleChoice(currentType)
}
