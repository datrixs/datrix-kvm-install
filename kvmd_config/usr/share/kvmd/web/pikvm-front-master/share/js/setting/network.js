import { tools, $ } from "../tools.js";
import { failed, success } from './utils.js'

export function initNetwork() {
    tools.fetch('/api/hardware_info/network').then(res => {
        const { Service, NIC, network, ipv4, ipv6, network_rate, DDNS } = res.result || {}

        $('project').value = Service.project
        $('http').value = Service.HTTP
        $('https').value = Service.HTTPS
        $('ssh').value = Service.SSH
        $('telnet').value = Service.Telnet

        $('nic').checked = NIC

        setNetwork(network)

        setIpv4AutoOrHand(ipv4.auto_ip)
        setIpv4(ipv4.auto_ip, ipv4)
        setIpv4DnsAutoOrHand(ipv4.auto_dns)
        setIpv4Dns(ipv4.auto_dns, ipv4)

        setIpv6AutoOrHand(ipv6.auto_ip)
        setIpv6(ipv6.auto_ip, ipv6)
        setIpv6DnsAutoOrHand(ipv6.auto_dns)
        setIpv6Dns(ipv6.auto_dns, ipv6)

        $('network_rate').value = network_rate

        setDDNS(DDNS.status, DDNS)
    }).catch(failed)
}

function setNetwork(network) {
    $('network').value = network

    tools.fetch('/api/hardware_info/network_rates').then(res => {
        $('network').innerHTML = Object.keys(res.result).sort((a, b) => a - b).map(key => {
            return `<option value=${key}>${res.result[key]}</option>`;
        }).join('')
    })
}

function setIpv4AutoOrHand(auto) {
    if (auto) {
        $('ipv4-auto').checked = 'checked'
    } else {
        $('ipv4-hand').checked = 'checked'
    }
}

function setIpv4DnsAutoOrHand(auto) {
    if (auto) {
        $('dns-auto').checked = 'checked'
    } else {
        $('dns-hand').checked = 'checked'
    }
}

function setIpv6AutoOrHand(auto) {
    if (auto) {
        $('ipv6-auto').checked = 'checked'
    } else {
        $('ipv6-hand').checked = 'checked'
    }
}

function setIpv6DnsAutoOrHand(auto) {
    if (auto) {
        $('dns6-auto').checked = 'checked'
    } else {
        $('dns6-hand').checked = 'checked'
    }
}

function setIpv4(auto, ipv4) {
    const address = $('ipv4-address')
    const netmask = $('ipv4-netmask')
    const broadcast = $('ipv4-broadcast')

    address.disabled = auto
    netmask.disabled = auto
    broadcast.disabled = auto

    if (ipv4) {
        address.value = ipv4.address
        netmask.value = ipv4.netmask
        broadcast.value = ipv4.broadcast
    }
}

function setIpv4Dns(auto, ipv4) {
    const master_dns = $('master_dns')
    const auxiliary_dns = $('auxiliary_dns')

    master_dns.disabled = auto
    auxiliary_dns.disabled = auto

    if (ipv4) {
        master_dns.value = ipv4.master_dns
        auxiliary_dns.value = ipv4.auxiliary_dns
    }
}

function setIpv6(auto, ipv6) {
    const address = $('ipv6-address')
    const prefix_len = $('ipv6-prefix_len')
    const broadcast = $('ipv6-broadcast')

    address.disabled = auto
    prefix_len.disabled = auto
    broadcast.disabled = auto

    if (ipv6) {
        address.value = ipv6.address
        prefix_len.value = ipv6.prefix_len
        broadcast.value = ipv6.broadcast
    }
}

function setIpv6Dns(auto, ipv6) {
    const master_dns = $('master_dns6')
    const auxiliary_dns = $('auxiliary_dns6')

    master_dns.disabled = auto
    auxiliary_dns.disabled = auto

    if (ipv6) {
        master_dns.value = ipv6.master_dns
        auxiliary_dns.value = ipv6.auxiliary_dns
    }
}

function setDDNS(open, ddns) {
    const hostname = $('hostname')
    const ddnsEle = $('ddns')
    const username = $('ddns-username')
    const password = $('ddns-password')
    const retry = $('ddns-retry')

    $('ddns-status').checked = open

    hostname.disabled = !open
    ddnsEle.disabled = !open
    username.disabled = !open
    password.disabled = !open
    retry.disabled = !open

    if (ddns) {
        hostname.value = ddns.hostname
        ddnsEle.value = ddns.ddns
        username.value = ddns.username
        password.value = ddns.password
        retry.value = ddns.retry_time
    }
}

function addDdnsChecked() {
    $('ddns-status').onchange = () => {
        setDDNS($('ddns-status').checked)
    }
}

function addIpv4Auto() {
    tools.radio.setOnClick('ipv4', function () {
        setIpv4($('ipv4-auto').checked)
    }, false)
    tools.radio.setOnClick('dns', function () {
        setIpv4Dns($('dns-auto').checked)
    }, false)
}

function addIpv6Auto() {
    tools.radio.setOnClick('ipv6', function () {
        setIpv6($('ipv6-auto').checked)
    }, false)
    tools.radio.setOnClick('dns6', function () {
        setIpv6Dns($('dns6-auto').checked)
    }, false)
}

function saveNetWork() {
    tools.el.setOnClick($('save-network'), function () {
        const Service = {
            project: $('project').value,
            HTTP: $('http').value,
            HTTPS: $('https').value,
            SSH: $('ssh').value,
            Telnet: $('telnet').value,
        }

        const NIC = $('nic').checked
        const network = $('network').value

        const ipv4Auto = $('ipv4-auto').checked
        const ipv4DnsAuto = $('dns-auto').checked
        const ipv4 = {
            auto_ip: ipv4Auto,
            address: $('ipv4-address').value,
            netmask: $('ipv4-netmask').value,
            broadcast: $('ipv4-broadcast').value,

            auto_dns: ipv4DnsAuto,
            master_dns: $('master_dns').value,
            auxiliary_dns: $('auxiliary_dns').value,
        }

        const ipv6Auto = $('ipv6-auto').checked
        const ipv6DnsAuto = $('dns6-auto').checked
        const ipv6 = {
            auto_ip: ipv6Auto,
            address: $('ipv6-address').value,
            prefix_len: $('ipv6-prefix_len').value,
            broadcast: $('ipv6-broadcast').value,

            auto_dns: ipv6DnsAuto,
            master_dns: $('master_dns6').value,
            auxiliary_dns: $('auxiliary_dns6').value,
        }
        const network_rate = $('network_rate').value

        const ddnsStatus = $('ddns-status').checked
        const DDNS = {
            status: ddnsStatus,
            hostname: $('hostname').value,
            ddns: $('ddns').value,
            username: $('ddns-username').value,
            password: $('ddns-password').value,
            retry_time: $('ddns-retry').value,
        }

        tools.fetch('/api/hardware_info/network', {
            method: 'post',
            body: { Service, NIC, network, ipv4, ipv6, network_rate, DDNS },
        }).then(() => success('网络配置修改成功，重启后生效', initNetwork)).catch(failed)
    })
}

function initEvent() {
    addDdnsChecked()
    addIpv4Auto()
    addIpv6Auto()
    saveNetWork()
}

initEvent()