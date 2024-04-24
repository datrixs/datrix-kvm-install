import { tools, $ } from "../tools.js";
import { failed, success } from './utils.js'
import { wm } from '../wm.js'
import { setProActive } from '../upgrade.js'

let submitting = false
let canUpgrade = false

export function initFirmware() {
    Promise.all([
        tools.fetch('/api/upgrade/system/version'),
        tools.fetch('/api/upgrade/pack/info'),
        tools.fetch('/api/system/rcc/settings'),
    ]).then(([versionResult, infoResult, rccSetting]) => {
        $('firmware_version').textContent = versionResult.result.version || ''

        const { version, depends, info } = infoResult.result

        canUpgrade = !!version
        
        tools.feature.setEnabled($('unavail'), !canUpgrade)
        tools.feature.setEnabled($('avail'), canUpgrade)
        tools.el.setOnClick($('view_version'), function () {
            if (canUpgrade) {
                availableUpgrade(version, depends, info)
            }
        })

        $('rcc_ip').value = rccSetting.result.addr
        $('rcc_port').value = rccSetting.result.port
        $('rcc_protocol').value = rccSetting.result.protocol
    }).catch(failed)
}

function addSubmit() {
    tools.el.setOnClick($('upgrade'), function () {
        const files = $('file').files

        if (!files.length && !canUpgrade) {
            failed('请先选择文件')
            return
        }

        if (submitting) return
        submitting = true

        Promise.resolve().then(() => {
            const file = files[0]

            if (file) {
                const form = new FormData()

                form.append('file', file)

                return tools.fetch('/api/upgrade/pack/upload', {
                    method: 'post',
                    contentType: '',
                    body: form,
                    timeout: 10 * 60 * 1000
                })
            }
        })
        .then(() => {
            setProActive(true)

            return tools.fetch('/api/upgrade/readyTo').catch(() => setProActive(false))
        })
        .catch(failed)
        .finally(() => {
            submitting = false
        })
    })
}

function availableUpgrade(version, depends, info) {
    wm.confirm(`
        版本：${version}</br>
        依赖版本：${depends}</br>
        升级内容：</br>
            ${info.split('\n').join('</br>')}
    `)
}

function rccSave() {
    tools.el.setOnClick($('rcc_save'), function () {
        const data = {
            addr: $('rcc_ip').value,
            port: $('rcc_port').value,
            protocol: $('rcc_protocol').value
        }

        tools.fetch('/api/system/rcc/settings', {
            method: 'post',
            body: data
        }).then(() => success('保存成功'))
        .catch(failed)
    })
}

function initEvent() {
    addSubmit()
    rccSave()
}

initEvent()