import { initUserInfo, permissionCodeMap, hasPermission } from "../getUserInfo.js";
import { tools, $, $$, $$$, getRedirect } from "../tools.js";
import { initWindowManager } from '../wm.js'
import { initUserManage } from './userManage.js'
import { initDeviceInfo } from './deviceInfo.js'
import { initNetwork } from './network.js'
import { initSecure } from './secure.js'
import { initTime } from './time.js'
import { initLogger } from './logger.js'
import { initFirmware } from './firmware.js'
import './edid.js'
import { initWs } from '../upgrade.js'

export function main() {
    collapseUl()
    initMenu()
    initWindowManager()
    initPermission()
    initWs({ current_page: 'setting' })
    setLogo()
}

function collapseUl() {
    $$('title').forEach(el => {
        tools.el.setOnClick(el, () => {
            tools.hidden.setVisible(el.nextElementSibling, !tools.hidden.isVisible(el.nextElementSibling))
        })
    })
}

function initMenu() {
    $$('menu').forEach(el => {
        tools.el.setOnClick(el, (e) => {
            const dataShow = e.target.getAttribute('data-show-cls')

            $$('opera').forEach(el => el.classList.toggle('active', false))
            e.target.classList.toggle('active', true)
            $$('right').forEach(el => tools.hidden.setVisible(el, false))
            $$(dataShow).forEach(el => tools.hidden.setVisible(el, true))
            initOpera(dataShow)
        }, false, true)
    })
}

function initOpera(opera) {
    switch (opera) {
        case 'user-manage':
            hasPermission(permissionCodeMap.userManage) && initUserManage()
            break;
        case 'device':
            hasPermission(permissionCodeMap.deviceInfoManage) && initDeviceInfo()
            break;
        case 'network':
            hasPermission(permissionCodeMap.networkSetting) && initNetwork()
            break;
        case 'secure':
            hasPermission(permissionCodeMap.secureSetting) && initSecure()
            break;
        case 'time':
            hasPermission(permissionCodeMap.timeSetting) && initTime()
            break;
        case 'logs':
            hasPermission(permissionCodeMap.loggerView) && initLogger()
            break;
        case 'firmware':
            hasPermission(permissionCodeMap.firmwareUpgrade) && initFirmware()
            break;
    
        default:
            break;
    }
}

function initPermission() {
    initUserInfo().then(() => {
        tools.feature.setEnabled($$$('.opera[data-show-cls="device"]')[0], hasPermission(permissionCodeMap.deviceInfoManage))
        tools.feature.setEnabled($$$('.opera[data-show-cls="network"]')[0], hasPermission(permissionCodeMap.networkSetting))
        tools.feature.setEnabled($$$('.opera[data-show-cls="secure"]')[0], hasPermission(permissionCodeMap.secureSetting))
        tools.feature.setEnabled($$$('.opera[data-show-cls="time"]')[0], hasPermission(permissionCodeMap.timeSetting))
        tools.feature.setEnabled($$$('.opera[data-show-cls="user-manage"]')[0], hasPermission(permissionCodeMap.userManage))
        tools.feature.setEnabled($$$('.opera[data-show-cls="logs"]')[0], hasPermission(permissionCodeMap.loggerView))
        tools.feature.setEnabled($$$('.opera[data-show-cls="firmware"]')[0], hasPermission(permissionCodeMap.firmwareUpgrade))
    })
}

function setLogo() {
    const logo = $('logo')

    logo.setAttribute('href', getRedirect('/'))
}