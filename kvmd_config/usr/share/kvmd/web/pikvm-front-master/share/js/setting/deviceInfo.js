import { tools, $ } from "../tools.js";
import { failed } from './utils.js'

export function initDeviceInfo() {
    tools.fetch('/api/hardware_info/equipment').then(result => {
        const { equ_info, ip_info } = result.result || {}

        $('equ_name').innerText = equ_info.equ_name || ''
        $('mfg').innerText = equ_info.MFG || ''
        $('version').innerText = equ_info.version || ''
        $('mac').innerHTML = equ_info.ether.map((mac, i) => {
            return `
            <p class="item">
                <span>MAC${i+1}地址：</span>
                <span class="value">${mac}</span>
            </p>
            `
        }).join('')

        $('ips').innerHTML = ip_info.map((item, i) => {
            return `
            ${i === 0 ? '<p class="desc">IP信息</p>' : ''}
            <p class="item">
                    <span>IP地址${i + 1}：</span>
                    <span class="value">${item.inet}</span>
                </p>
                <p class="item">
                    <span>子网掩码${i + 1}：</span>
                    <span class="value">${item.netmask}</span>
                </p>
                <p class="item">
                    <span>网关${i + 1}：</span>
                    <span class="value">${item.broadcast || ''}</span>
                </p>
                <p class="item">
                    <span>主要DNS服务器${i + 1}：</span>
                    <span class="value">${item.dns_master_1}</span>
                </p>
                <p class="item">
                    <span>备用DNS服务器${i + 1}：</span>
                    <span class="value">${item.dns_auxiliary_1}</span>
                </p>
                <p class="item">
                    <span>IPv6地址${i + 1}：</span>
                    <span class="value">${item.inet6}</span>
                </p>
                <p class="item">
                    <span>IPv6子网络前缀长度${i + 1}：</span>
                    <span class="value">${item.prefix_len}</span>
                </p>
            `
        }).join('')

    }).catch(failed)
}