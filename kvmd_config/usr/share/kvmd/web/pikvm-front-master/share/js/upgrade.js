import { tools, $, $$, getRedirect, getQueryString } from './tools.js'
import baseUrl from "./setting.js";
import { wm } from './wm.js'
import { failed } from './setting/utils.js'
import './dayjs.js'

let isUpgrading = false // 升级中
let isProActive = false // 主动发起升级
let keepTimer = null // 保活定时器

export function toQueryStr(obj) {
    let result = ''

    for (const key in obj) {
        const item = key + '=' + (obj[key] || '')
        result += (result ? '&' + item : item)
    }
    return result
}

export function getWsUrl(query = null) {
    const str = toQueryStr({ ...query, auth_token: tools.auth_token, from: getQueryString('from') })
    
    return `${tools.is_https ? "wss" : "ws"}://${baseUrl.ws_base_url}/api/ws?${str}`
}

export function initWs(query) {
    const wsUrl = getWsUrl(query)
    let ws = new WebSocket(wsUrl)
    const ping = pingServer(ws)
    const close = function () {
        ping.stop()
        ws && ws.close()
        ws= null
    }

    ws.onmessage = function(event) {
        const data = JSON.parse(event.data);

        onMessage(data, close)
    }
    ws.onopen = function () {
        ping.start()
    }
    ws.onerror = close
    ws.onclose = close

    window.addEventListener('beforeunload', function () {
        close()
    })
}

export function onMessage(data, close) {
    if (data.event_type === 'upgrade_state' && data.event) {
        // 升级中
        if (data.event.status === 1) {
            cancelKeep()
            startUpgrade(5000, data.event)
            close && close()
            return
        }

        // 准备升级
        if (data.event.status === 2) {
            const delay = data.event.minute
            const content = [
                'KVM将进行系统升级，升级时无法操作；</br>',
                '如需取消升级，请点击下方取消按钮；</br>',
                `不做任何操作将于${delay}分钟后自动升级；`
            ]

            if (isProActive) {
                content.push('</br></br>')
                content.push(`版本：${data.event.version}</br>`)
                content.push(`依赖版本：${data.event.depends}</br>`)
                content.push('升级内容：</br>')
                content.push(`${data.event.info.split('；').join('；</br>')}`)
            }

            keepAlive()
            preUpgrade(content.join(''), delay)
            return
        }

        // 取消升级
        if (data.event.status === 3) {
            isUpgrading = false
            isProActive = false
            cancelKeep()
            closeAllModal()
        }
    }
    if (data.event_type === 'exit_kvm') {
        exitKVM()
        close && close()
        return
    }
    // EDID重启
    if (data.event_type === 'edid_state') {
        if (data.event.status === 2) {
            restartEDID()
            close && close()
            return
        }
    }
    if (data.event_type === 'control_permission') {
        setControlBtn(data.event)
    }
    if (data.event_type === 'control_notify') {
        setControlNotify(data.event)
    }
}

export function inUpgrading() {
    return isUpgrading
}

export function setProActive(val) {
    isProActive = val
}

function pingServer(ws) {
    const ping = function () {
        ws.send(JSON.stringify({ event_type: "ping", event: {} }));
    }
    let timer;

    return {
        start: function () {
            timer = setInterval(ping, 3000)
        },
        stop: function () {
            clearInterval(timer)
        }
    }
}

function startUpgrade(delay, data) {
    const check = function () {
        tools.fetch('/api/auth/check').then(success).catch(function (err) {
            const status = err && err.status

            if (status === 401 || status === 403) {
                success()
                return
            }
            setTimeout(check, delay)
        })
    }

    setTimeout(check, delay)
    isUpgrading = true
    closeAllModal()
    wm.custom('', (data && data.msg) || '正在升级中...')
}

function closeAllModal() {
    $$('modal').forEach(i => wm.closeWindow(i))
}

function success(info = '升级完成！') {
    closeAllModal()
    wm.info(info).then(function () {
        isUpgrading = false
        isProActive = false
        window.onbeforeunload = null
        document.location.href = getRedirect()
    })
}

// 保持token不失效
function keepAlive() {
    if (keepTimer) return

    keepTimer = setTimeout(() => {
        tools.fetch('/api/auth/check')
    }, 10 * 1000)
}

function cancelKeep() {
    if (keepTimer) {
        clearTimeout(keepTimer)
        keepTimer = null
    }
}

// 准备升级
function preUpgrade(content, delay) {
    closeAllModal()

    // 超时设置
    if (delay <= 0) {
        tools.fetch('/api/upgrade/confirm', { method: 'post' }).catch(failed)
        return
    }

    wm.confirm(content).then(confirm => {
        closeAllModal()

        if (confirm) {
            tools.fetch('/api/upgrade/confirm', { method: 'post' }).catch(failed)
        } else {
            // 取消升级
            tools.fetch('/api/upgrade/cancel').catch(failed)
        }
    })
}

// 强制退出
function exitKVM() {
    let http = tools.makeRequest("POST", "/api/auth/logout", function() {
        if (http.readyState === 4) {
            if (http.status === 200 || http.status === 401 || http.status === 403) {
                window.onbeforeunload = null
                document.location.href = getRedirect()
            } else {
                wm.error("注销错误:<br>", http.responseText);
            }
        }
    });
}

function restartEDID() {
    const delay = 5000
    const check = function () {
        tools.fetch('/api/auth/check').then(() => success('重启完成！')).catch(function (err) {
            const status = err && err.status

            if (status === 401 || status === 403) {
                success('重启完成！')
                return
            }
            setTimeout(check, delay)
        })
    }

    setTimeout(check, delay)
    closeAllModal()
    wm.custom('', '正在重启中...')
}

// 机台独占模式下申请权限
let applyEndTime = new Date() 
let ignoreApplyEndTime = new Date()   
let controlWindow = document.body.appendChild(document.createElement('div'))
let rejected = null
let notified = null

export function applyControl() {
    if (dayjs().isAfter(applyEndTime)) {
        startApply().then(() => {
            tools.fetch('/api/kvm/control/notify', { method: 'post' })
                .then(() => {
                    applyEndTime = dayjs().add(5, 'minute')
                })
                .catch(failed)
        })
        return 
    }
    hasNotify()
}

function startApply() {
    return wm.custom(
        '', 
        '当前机台有用户远程占用中，是否通知请求对方结束远程控制？',
        true,
        true,
        controlWindow,
        { okText: '确定通知' }
    ).then(confirm => {
        if (confirm) {
            return Promise.resolve()
        }
        return Promise.reject('cancel notify')
    })
}

function hasNotify() {
    const getOkText = () => {
        const minute = applyEndTime.diff(new Date(), 'minute')
        const time = minute > 0 ? minute + '分钟' : applyEndTime.diff(new Date(), 'second') + '秒'

        return `已通知(${time}后可再次通知)`
    }
    const timer = setInterval(() => {
        const ele = controlWindow.querySelector('.ok')
        const isAfter = dayjs().isAfter(applyEndTime)

        if (isAfter) {
            ele.click()
            applyControl()
            return
        }

        ele.innerHTML = getOkText()
    }, 1000);

    wm.custom(
        '', 
        '当前机台有用户远程占用中，是否通知请求对方结束远程控制？',
        true,
        true,
        controlWindow,
        { okText: getOkText(), okCls: 'ok' }
    ).then(() => {
        clearInterval(timer)
    })
}

function setControlBtn(data) {
    const ele = $('feature-control')
    const eleLine = $('feature-control-line')
    const target = $('apply-control')
    // 独占模式下 无权限时展示
    const showBtn = data.users_mode === 3 && !data.control

    ele && tools.feature.setEnabled(ele, showBtn)
    eleLine && tools.feature.setEnabled(eleLine, showBtn)
    if (target && !target.onclick) {
        tools.el.setOnClick(target, applyControl)
    }
}

function setControlNotify(data) {
    if (dayjs().isAfter(ignoreApplyEndTime) && data.method === 'notify' && !notified) {
        notified = true

        let count = 30
        let isIgnore = false
        const getOkText = () => `确定解除(${count --}s)`
        const timer = setInterval(() => {
            const ele = controlWindow.querySelector('.ok')

            if (count < 0) {
                ele.click()
                return
            }
            
            ele.innerHTML = getOkText()
        }, 1000);

        wm.custom(
            '', 
            `有其他用户申请进行远程控制，是否解除占用？
            <div style="margin-top: 10px;">
                <input type="checkbox" id="ignore" />
                <label for="ignore">5分钟内不再收到此消息</label>
            </div>
            `,
            true,
            true,
            controlWindow,
            { noText: '拒绝', okText: getOkText(), okCls: 'ok' }
        ).then(confirm => {
            notified = false
            clearInterval(timer)

            if (isIgnore) {
                ignoreApplyEndTime = dayjs().add(5, 'minute')
            }
            // 此时可能已经由其他用户取消
            if (!rejected) {
                if (confirm) {
                    tools.fetch('/api/kvm/control/accept', { method: 'post' }).catch(failed)
                } else {
                    tools.fetch('/api/kvm/control/reject', { method: 'post' }).catch(failed)
                }
            }
            rejected = false
        })
        // 绑定选框
        const checkbox = controlWindow.querySelector('#ignore')
        if (checkbox) {
            tools.el.setOnClick(checkbox, function() {
                isIgnore = checkbox.checked
            }, false)
        }
    }
    if (data.method === 'reject') {
        const okBtn = controlWindow.querySelector('.ok')

        rejected = true
        okBtn && okBtn.click()
    }
}