import { tools, $ } from "../tools.js";
import "../dayjs.js";
import { success, failed } from './utils.js'

let timer = null

export function initTime() {
    Promise.all([
        tools.fetch('/api/hardware_info/datetime'),
        tools.fetch('/api/hardware_info/zoneinfo_map'),
        tools.fetch('/api/hardware_info/ntp_servers'),
    ]).then(([dateRes, zoneMap, ntpRes]) => {
        const { zone_info, dst, date, time, network_datetime } = dateRes.result

        setZone(zone_info, zoneMap.result)

        $('dst').checked = dst
        $('date').value = date

        stopTime()
        setTime(time.split(':'))
        startTime(date + ' ' + time)

        setNetworkTime(network_datetime, ntpRes.result.net_servers)
        setNetworkTimeCheckBox()
    })
}

function setZone(zone, zoneMap) {
    $('zone').innerHTML = Object.keys(zoneMap).map(key => {
        return `<option value=${key}>${zoneMap[key]}</option>`;
    })
    $('zone').value = zone
}

function setTime([h, m, s]) {
    const hour = $('hour')
    const minute = $('minute')
    const second = $('second')

    document.activeElement !== hour && (hour.value = h)
    document.activeElement !== minute && (minute.value = m)
    document.activeElement !== second && (second.value = s)
}

function setNetworkTime(data, ntpList) {
    $('auto_calibration').checked = data.auto_calibration

    $('master_datetime_server').innerHTML = ntpList.map(ntp => {
        return `<option value=${ntp}>${ntp}</option>`;
    })
    $('master_datetime_server').value = data.master_datetime_server

    $('master_server_ip_enable').checked = data.master_server_ip[0]
    $('master_server_ip').value = data.master_server_ip[1]

    $('subsidiary_server_status').checked = data.subsidiary_server_status

    $('sub_datetime_server').innerHTML = ntpList.map(ntp => {
        return `<option value=${ntp}>${ntp}</option>`;
    })
    $('sub_datetime_server').value = data.subsidiary_datetime_server

    $('sub_server_ip_enable').checked = data.subsidiary_server_ip[0]
    $('sub_server_ip').value = data.subsidiary_server_ip[1]

    $('auto_calibration_interval').value = data.auto_calibration_interval
}

function setNetworkTimeCheckBox() {
    const auto_calibration = $('auto_calibration').checked
    const master_datetime_server = $('master_datetime_server')
    const master_server_ip_enable = $('master_server_ip_enable')
    const master_server_ip = $('master_server_ip')
    const subsidiary_server_status = $('subsidiary_server_status')
    const sub_datetime_server = $('sub_datetime_server')
    const sub_server_ip_enable = $('sub_server_ip_enable')
    const sub_server_ip = $('sub_server_ip')
    const auto_calibration_interval = $('auto_calibration_interval')

    master_datetime_server.disabled = !auto_calibration
    master_server_ip_enable.disabled = !auto_calibration
    master_server_ip.disabled = !auto_calibration || !master_server_ip_enable.checked

    subsidiary_server_status.disabled = !auto_calibration
    sub_datetime_server.disabled = !auto_calibration || !subsidiary_server_status.checked

    sub_server_ip_enable.disabled = !auto_calibration
    sub_server_ip.disabled = !auto_calibration || !sub_server_ip_enable.checked

    auto_calibration_interval.disabled = !auto_calibration
}

function zoneChange() {
    $('zone').onchange = function () {
        tools.fetch(`/api/hardware_info/get_zone_time?zone_info=${$('zone').value}`)
        .then(res => {
            const { date, time } = res.result

            $('date').value = date

            stopTime()
            setTime(time.split(':'))
            startTime(date + ' ' + time)
        })
    }
}

function syncDateTime() {
    tools.el.setOnClick($('date-time-sync'), function () {
        const date_time = `${$('date').value} ${$('hour').value}:${$('minute').value}:${$('second').value}`
        const zone_info = $('zone').value
        const dst = $('dst').checked

        Promise.all([
            tools.fetch('/api/hardware_info/zoneinfo', { method: 'post', body: { zone_info } }),
            tools.fetch('/api/hardware_info/dst', { method: 'post', body: { dst } }),
            tools.fetch('/api/hardware_info/datetime', { method: 'post', body: { date_time } }),
        ]).then(() => success('时区、夏时制、日期时间同步成功')).catch(failed)
    })
}

function startTime(current) {
    timer = setTimeout(() => {
        const next = dayjs(current).add(1, 'second')

        setTime(next.format('HH:mm:ss').split(':'))
        startTime(next)
    }, 1000);
}

function stopTime() {
    clearTimeout(timer)
    timer = null
}

function syncNetworkTime() {
    tools.el.setOnClick($('sync-network-time'), function () {
        const data = {
            auto_calibration: $('auto_calibration').checked,
            master_datetime_server: $('master_datetime_server').value,
            master_server_ip: [$('master_server_ip_enable').checked, $('master_server_ip').value],
            subsidiary_server_status: $('subsidiary_server_status').checked,
            subsidiary_datetime_server: $('sub_datetime_server').value,
            subsidiary_server_ip: [$('sub_server_ip_enable').checked, $('sub_server_ip').value],
            auto_calibration_interval: $('auto_calibration_interval').value
        }

        tools.fetch('/api/hardware_info/calibration', {
            method: 'post',
            body: data,
        }).then(() => success('校准时间成功')).catch(failed)
    })
}

function networkTimeCheckBoxChange() {
    $('auto_calibration').onchange = setNetworkTimeCheckBox
    $('master_server_ip_enable').onchange = setNetworkTimeCheckBox
    $('subsidiary_server_status').onchange = setNetworkTimeCheckBox
    $('sub_server_ip_enable').onchange = setNetworkTimeCheckBox
}

function initEvent() {
    zoneChange()
    syncDateTime()
    syncNetworkTime()
    networkTimeCheckBoxChange()
}

initEvent()