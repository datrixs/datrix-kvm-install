import { tools, $, $$$ } from "../tools.js";
import { failed, success } from './utils.js'

const CHOICE_LEVEL = '0'
const MIDDLE_LEVEL = '1'
const MIDDLE_HIGH_LEVEL = '2'
const HIGH_LEVEL = '3'
const HTTPS = '5'
let safetyResult
let mapResult

export function initSecure() {
    Promise.all([
        tools.fetch('/api/hardware_info/safety'),
        tools.fetch('/api/hardware_info/safety_maps')
    ]).then(([res, mapRes]) => {
        const { login_fail, filter, safe_level, operating_mode, users_mode } = res.result
        const { safety_level_map, safety_level_choice_map, operating_mode_map, users_mode_map } = mapRes.result

        safetyResult = res.result
        mapResult = mapRes.result

        setLoginFail(login_fail.open, login_fail, login_fail.open)

        setIps(filter.filter_ip, filter, filter.filter_ip, filter.ip_include)

        $('login_str').value = filter.login_str

        setMacs(filter.filter_mac, filter, filter.filter_mac, filter.mac_include)

        initSafeLevel(safe_level, safety_level_map, safety_level_choice_map)

        setOperaMode(operating_mode, operating_mode_map)

        setUserMode(users_mode, users_mode_map)
        setUserMax(users_mode.limit)
    }).catch(failed)
}

function setLoginFail(open, data, defaultState) {
    const openEle = $('login_fail_open')
    const recycle = $('recycle')
    const timeout = $('timeout')
    const lock_client = $('lock_client')
    const lock_account = $('lock_account')

    recycle.disabled = !open
    timeout.disabled = !open
    lock_client.disabled = !open
    lock_account.disabled = !open

    if (data) {
        recycle.value = data.recycle
        timeout.value = data.timeout
        lock_client.checked = data.lock_client
        lock_account.checked = data.lock_account
    }

    if (defaultState !== void 0) {
        openEle.checked = defaultState
    }
}

function setIps(enable, data, defaultEnable, defaultInclude) {
    const include = $('ip_include')
    const noinclude = $('ip_noinclude')
    const ips = $('filter_ips')

    include.disabled = !enable
    noinclude.disabled = !enable
    ips.disabled = !enable

    if (data) {
        ips.value = data.ips.join('\n')
    }
    if (defaultEnable !== void 0) {
        $('ip_enable').checked = defaultEnable
    }
    if (defaultInclude !== void 0) {
        if (defaultInclude) {
            include.checked = 'checked'
        } else {
            noinclude.checked = 'checked'
        }
    }
}

function setMacs(enable, data, defaultEnable, defaultInclude) {
    const include = $('mac_include')
    const noinclude = $('mac_noinclude')
    const macs = $('filter_macs')

    include.disabled = !enable
    noinclude.disabled = !enable
    macs.disabled = !enable

    if (data) {
        macs.value = data.macs.join('\n')
    }
    if (defaultEnable !== void 0) {
        $('mac_enable').checked = defaultEnable
    }
    if (defaultInclude !== void 0) {
        if (defaultInclude) {
            include.checked = 'checked'
        } else {
            noinclude.checked = 'checked'
        }
    }
}

function initSafeLevel(safe_level, safeMap, safeChoiceMap) {
    const { tls_version_map } = mapResult
    $('safe_level').innerHTML = Object.keys(safeMap).sort((a, b) => b - a).map((key, i) => {
        const isChoice = key == CHOICE_LEVEL

        return `
        <div class="${isChoice ? 'item item-self' : ''}">
            <input id="safe-level-${key}" name="safe-level" value="${key}" type="radio">
            <label for="safe-level-${key}">${safeMap[key]}</label>
            ${isChoice ? `
                <div>
                    ${Object.keys(safeChoiceMap).map(i => {
                        return `
                        <div>
                            <input id="safe-level-choice-${i}" name="safe-choice" type="checkbox" value="${i}">
                            <label for="safe-level-choice-${i}">${safeChoiceMap[i]}</label>
                            ${
                                // tls
                                i === HTTPS ? `
                                    <select name="" id="tls" class="value">
                                        ${Object.keys(tls_version_map).map(tlsValue => {
                                            return `<option value=${tlsValue}>${tls_version_map[tlsValue]}</option>`;
                                        })}
                                    </select>
                                ` : ''
                            }
                        </div>
                        `
                    }).join('')}
                </div>
            ` : ''}
        </div>
        `
    }).join('')

    addSafeLevelClick()
    setSafeLevel(safe_level)
}

function setSafeLevel({ level, choices, tls_version }) {
    $(`safe-level-${level}`).checked = 'checked'
    $('tls').value = tls_version

    // 自定义时才启用
    const isChoice = String(level) === CHOICE_LEVEL
    for (let el of $$$(`input[type="checkbox"][name="safe-choice"]`)) {
        tools.el.setEnabled(el, isChoice);
    }
    $('tls').disabled = !isChoice

    for (let el of $$$(`input[type="checkbox"][name="safe-choice"]`)) {
        el.checked = choices.includes(Number(el.value)) ? 'checked' : ''
    }
}

function setOperaMode(operaMode, operaMap) {
    const allowMultiUserOpera = 2

    $('opera-mode').innerHTML = Object.keys(operaMap).map(key => {
        const isMultiUser = Number(key) === allowMultiUserOpera
        const checked = operaMode.includes(Number(key)) || isMultiUser ? 'checked' : ''

        return `
        <div>
            <input type="checkbox" value="${key}" name="opera-mode" id="opera-mode-${key}" ${checked} ${isMultiUser ? 'disabled': ''} />
            <label for="opera-mode-${key}">${operaMap[key]}</label>
        </div>
        `
    }).join('')
}

function setUserMode(userMode, userModeMap) {
    $('users_mode').innerHTML = Object.keys(userModeMap).map(key => {
        return `<option value=${key}>${userModeMap[key]}</option>`;
    })
    $('users_mode').value = userMode.users_mode
    // $('user-timeout').value = userMode.timeout
}

function setUserMax(limit) {
    $('users_max').value = limit
}

function addLoginFailClick() {
    $('login_fail_open').onchange = () => {
        setLoginFail($('login_fail_open').checked)
    }
}

function addFilterIpClick() {
    $('ip_enable').onchange = () => {
        setIps($('ip_enable').checked)
    }
}

function addFilterMacClick() {
    $('mac_enable').onchange = () => {
        setMacs($('mac_enable').checked)
    }
}

function addSafeLevelClick() {
    tools.radio.setOnClick('safe-level', () => {
        const level = tools.radio.getValue('safe-level')
        const choicesMap = {
            [CHOICE_LEVEL]: safetyResult.safe_level.choices,
            [MIDDLE_LEVEL]: mapResult.safety_level_middle_map.choice,
            [MIDDLE_HIGH_LEVEL]: mapResult.safety_level_middle_high_map.choice,
            [HIGH_LEVEL]: mapResult.safety_level_high_map.choice,
        }
        const tlsMap = {
            [CHOICE_LEVEL]: safetyResult.safe_level.tls_version,
            [MIDDLE_LEVEL]: mapResult.safety_level_middle_map.tls,
            [MIDDLE_HIGH_LEVEL]: mapResult.safety_level_middle_high_map.tls,
            [HIGH_LEVEL]: mapResult.safety_level_high_map.tls,
        }
        
        setSafeLevel({
            level, 
            choices: choicesMap[level] || [],
            tls_version: tlsMap[level]
        })
    }, false)
}

function saveSecure() {
    tools.el.setOnClick($('save-secure'), function () {
        const login_fail = {
            open: $('login_fail_open').checked,
            recycle: Number($('recycle').value) || 0,
            timeout: $('timeout').value,
            lock_client: $('lock_client').checked,
            lock_account: $('lock_account').checked,
        }

        if (login_fail.open && login_fail.recycle <= 0) {
            failed('登录失败允许的次数必须为正整数')
            return
        }

        const count = $('users_max').value
        const countNumber = Number(count)

        if (Number.isNaN(countNumber) || countNumber < 1 || countNumber > 15) {
            failed('同时在线人数上限必须为1-15之间的整数')
            return
        }

        const filter = {
            filter_ip: $('ip_enable').checked,
            ip_include: $('ip_include').checked,
            ips: $('filter_ips').value.split('\n').filter(i => !!i),
            login_str: $('login_str').value,
            filter_mac: $('mac_enable').checked,
            mac_include: $('mac_include').checked,
            macs: $('filter_macs').value.split('\n').filter(i => !!i),
        }
        const safe_level = {
            level: Number(tools.radio.getValue('safe-level')),
            choices: Array.from($$$('input[type="checkbox"][name="safe-choice"]:checked')).map(el => Number(el.value)),
            tls_version: Number($('tls').value)
        }
        const operating_mode = Array.from($$$('input[type="checkbox"][name="opera-mode"]:checked')).map(el => el.value)
        const users_mode = {
            users_mode: $('users_mode').value,
            limit: countNumber
            // timeout: $('user-timeout').value
        }

        tools.fetch('/api/hardware_info/safety', {
            method: 'post',
            body: { login_fail, filter, safe_level, operating_mode, users_mode }
        }).then(() => success('保存成功', initSecure)).catch(failed)
    })
}

function initEvent() {
    addLoginFailClick()
    addFilterIpClick()
    addFilterMacClick()
    saveSecure()
}

initEvent()