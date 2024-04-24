import { tools, getRedirect } from "./tools.js";
import { failed } from './setting/utils.js'

let userInfo = null // { permissions: [] }

export const permissionCodeMap = {
    viewVideoStream: 1,
    remoteControl: 2,
    msdVirtualStorage: 3, // 暂时没有
    ocr: 4,
    deviceInfoManage: 5,
    networkSetting: 6,
    secureSetting: 7,
    timeSetting: 8,
    userManage: 9,
    loggerView: 10,
    firmwareUpgrade: 11,
    edid: 12, // 弃用
}

export function initUserInfo(noCache, silence) {
    return new Promise(resolve => {
        if (userInfo === null || noCache) {
            tools.fetch('/api/auth/userinfo').then(res => {
                userInfo = { permissions: [], ...res.result }
                
                // 检查用户信息
                if (!userInfo || !userInfo.id) {
                    document.location.href = getRedirect()
                }
            })
            .catch(err => {
                const status = err && err.status

                if (status === 401 || status === 403) {
                    document.location.href = getRedirect()
                } else {
                    !silence && failed(err)
                }
            })
            .finally(() => {
                resolve(userInfo)
            })
        } else {
            resolve(userInfo)
        }
    })
}

export function hasPermission(codes) {
    codes = Array.isArray(codes) ? codes : [codes]

    for (const code of codes) {
        if (!userInfo || !userInfo.permissions.includes(code)) {
            return false
        }
    }
    return true
}