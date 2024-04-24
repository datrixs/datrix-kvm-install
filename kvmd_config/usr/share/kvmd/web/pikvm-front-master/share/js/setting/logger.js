import { tools, $ } from "../tools.js";
import { failed } from './utils.js'

let list = []
let page = 1
let size = 20
let total = 0
let loading = false

const levelMap = {
    0: 'DEBUG',
    5: 'INFO',
    10: 'WARNING',
    15: 'ERROR',
}

export function initLogger() {
    list = []
    page = 1
    size = 20

    query()
}

function query() {
    tools.fetch(`/api/sys_logs?page=${page}&size=${size}`).then((res) => {
        const { count, data } = res.result

        list = data
        total = count

        renderTable()
    }).catch(failed)
}

function renderTable() {
    $('table-body').innerHTML = list.map(i => {
        return `
        <tr class="table-row">
            <td>${i.create_time}</td>
            <td>${levelMap[i.level]}</td>
            <td>${i.username}</td>
            <td>${i.description}</td>
        </tr>
        `
    }).join('')
    tools.hidden.setVisible($('logs-empty'), list.length <= 0)
}

function switchPage() {
    tools.el.setOnClick($('prev-page'), function () {
        if (!loading && page > 1) {
            page -= 1
            query()
        }
    })
    tools.el.setOnClick($('next-page'), function () {
        if (!loading && (page * size) < total) {
            page += 1
            query()
        }
    })
}

function initEvent() {
    switchPage()
}

initEvent()