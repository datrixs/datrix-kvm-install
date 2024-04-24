import { wm } from '../wm.js'

export function success(msg, cb) {
    wm.info(msg || '操作成功')
    cb && cb()
}

export function failed(err) {
    const errMsg = typeof err === 'string' 
        ? err 
        : (
            err && 
            err.response && 
            err.response.result && 
            (err.response.result.error_msg || err.response.result.msg)
        ) || '操作失败'
    
    wm.error(errMsg)
}