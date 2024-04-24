import { tools, $ } from "../tools.js";
import { failed, success } from './utils.js'
import { wm } from '../wm.js'

function addShowInfo() {
    const showEdidBtn = $('show_edid')

    tools.el.setOnClick(showEdidBtn, function () {
        tools.el.setEnabled(showEdidBtn, false)
        tools.fetch('/api/edid/current').then(res => {
            const {basic_audio,manufacturer_id,monitor_name,product_id,resolution,serial_number} = res.result 

            wm.info(`
                ID Manufacture Name: ${manufacturer_id}</br>
                ID Product Code: ${product_id}</br>
                ID Serial Number: ${serial_number}</br>
                Monitor Name: ${monitor_name}</br>
                Basic Audio: ${basic_audio}</br>
                Preferred Resolution: ${resolution}</br>
            `)
        })
        .catch(failed)
        .finally(() => tools.el.setEnabled(showEdidBtn, true))
    })
}

function addUpdateInfo() {
    const updateEdidBtn = $('update_edid')

    tools.el.setOnClick(updateEdidBtn, function () {
        tools.el.setEnabled(updateEdidBtn, false)
        Promise.all([
            tools.fetch('/api/edid/current'),
            tools.fetch('/api/edids'),
        ]).then(([info, edidsResult]) => {
            const {basic_audio,manufacturer_id,monitor_name,product_id,resolution,serial_number} = info.result 
            const edids = edidsResult.result.data || []
            let selectResolution = resolution

            window.onResolutionChange = function() {
                selectResolution = $('resolution').value
            }

            wm.custom('', `
                ID Manufacture Name: ${manufacturer_id}</br>
                ID Product Code: ${product_id}</br>
                ID Serial Number: ${serial_number}</br>
                Monitor Name: ${monitor_name}</br>
                Basic Audio: ${basic_audio}</br>
                Preferred Resolution: ${resolution}</br>
                </br>
                <select name="" id="resolution" onchange="onResolutionChange()">
                    ${edids.map(i => {
                        return `<option value=${i} ${resolution === i ? 'selected':''}>${i}</option>`
                    })}
                </select>
            `, true, true, null, { okText: '更新' }).then((confirm) => {
                if (confirm && resolution !== selectResolution) {
                    updateResolution(selectResolution)
                }
            }).finally(() => {
                window.onResolutionChange = null
            })
        }).catch(failed)
        .finally(() => tools.el.setEnabled(updateEdidBtn, true))
    })
}

function updateResolution(resolution) {
    const updateEdidBtn = $('update_edid')

    tools.el.setEnabled(updateEdidBtn, false)
    tools.fetch('/api/edid/set', { method: 'post', body: { resolution } }).then(() => {
        wm.custom(
            '', 
            `EDID已修改为：${resolution}，重启后生效，是否立即重启？`, 
            true, 
            true, 
            null, 
            { okText: '立即重启', noText: '稍后手动重启' }
        ).then((confirm) => {
            if (confirm) {
                tools.fetch('/api/edid/reboot', { method: 'post' }).catch(failed)
            }
        })
    }).catch(failed)
    .finally(() => tools.el.setEnabled(updateEdidBtn, true))
}

function initEvent() {
    addShowInfo()
    addUpdateInfo()
}

initEvent()