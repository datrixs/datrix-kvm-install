import { tools, $, $$$ } from "../tools.js";
import { success, failed } from './utils.js'

let roleTree = []
let permissionList = []

export function initUserManage() {
    $('user-role-menu').innerHTML = ''
    tools.hidden.setVisible($('role-panel'), false)
    tools.hidden.setVisible($('user-panel'), false)

    Promise.all([
        tools.fetch('/api/roles'),
        tools.fetch('/api/permissions'),
    ]).then(([roles, permissions]) => {
        /**
         * interface Role {
         *      id: number
         *      name: string
         *      remark: string | null
         *      permissions: number[]
         * }
         * interface Permission {
         *      id: number
         *      name: string
         * }
         * interface User {
         *      id: number
         *      username: string
         *      remark: string
         *      role_id: number
         *      lock_status： boolean
         * }
         */
        const rolesResult = roles.result.data

        Promise.all(rolesResult.map(role => tools.fetch(`/api/users?role_id=${role.id}`))).then(list => {
            for (let i = 0, len = rolesResult.length; i < len; i++) {
                const role = rolesResult[i]

                role.users = list[i].result.data
            }

            roleTree = rolesResult
            permissionList = permissions.result.data

            setUserRoleMenu()
            setUserRole()
        }).catch(failed)
    }).catch(failed)
}

function addUserRoleMenuClick() {
    tools.el.setOnClick($('user-role-menu'), e => {
        const { role, user } = e.target.dataset || {}

        if (role) {
            for (const i of roleTree) {
                if (i.id == role) {
                    if (user) {
                        for (const j of i.users) {
                            if (j.id == user) {
                                showUserPanel(j, false)
                                return
                            }
                        }
                    }
                    showRolePanel(i, false)
                    return
                }
            }
        }
    }, false, true)
}

function setUserRoleMenu() {
    $('user-role-menu').innerHTML = roleTree.map(role => {
        return `
            <p data-role="${role.id}">${role.name}</p>
            <ul>
                ${role.users.map(user => {
                    return `<li data-role="${role.id}" data-user="${user.id}">${user.username}</li>`
                }).join('')}
            </ul>
        `
    }).join('')
}

function setUserRole() {
    $('user_role').innerHTML = roleTree.map(role => {
        return `<option value=${role.id}>${role.name}</option>`;
    }).join('')
}

function showUserPanel(user, isAdd) {
    tools.hidden.setVisible($('role-panel'), false)
    tools.hidden.setVisible($('user-panel'), true)

    $('user-id').value = user.id || ''
    $('username').value = user.username || ''
    $('password').value = user.password || ''
    $('repeat_password').value = user.repeat_password || ''
    $('user_role').value = user.role_id || ''
    $('remark').value = user.remark || ''

    tools.hidden.setVisible($('reset-password'), !isAdd)
    updateUserLock(user, isAdd)
}

function updateUserLock(user, isAdd) {
    $('lock_or_unlock').textContent = user.lock_status ? '解锁' : '锁定'
    tools.hidden.setVisible($('lock_or_unlock'), !isAdd)
}

function showRolePanel(role, isAdd) {
    tools.hidden.setVisible($('role-panel'), true)
    tools.hidden.setVisible($('user-panel'), false)

    $('role-id').value = role.id || ''
    $('role-name').value = role.name || ''
    $('role-remark').value = role.remark || ''
    $('permissions').innerHTML = permissionList.map(permission => {
        const checked = isAdd 
            ? '' 
            : role.permissions.includes(permission.id) 
                ? 'checked' 
                : ''
        const id = `user-permission-${permission.id}`

        return `
        <p>
            <input id="${id}" data-id="${permission.id}" type="checkbox" ${checked}>
            <label for="${id}">${permission.name}</label>
        </p>
        `
    }).join('')
}

function addSaveClick() {
    tools.el.setOnClick($('user-save'), function () {
        if (tools.hidden.isVisible($('role-panel'))) {
            const roleId = $('role-id').value
            const roleName = $('role-name').value
            const remark = $('role-remark').value
            const permissions = Array.from($$$('#permissions input[type=checkbox]:checked')).reduce((arr, el) => {
                arr.push(el.dataset.id)
                return arr
            }, [])

            let promise

            if (roleId) {
                promise = tools.fetch(`/api/roles/${roleId}`, {
                    method: 'put',
                    body: {
                        name: roleName,
                        remark,
                        permissions
                    }
                })
            } else {
                promise = tools.fetch('/api/roles', {
                    method: 'post',
                    body: {
                        name: roleName,
                        remark,
                        permissions
                    }
                })
            }

            promise.then(() => success(void 0, initUserManage)).catch(failed)
        }
        if (tools.hidden.isVisible($('user-panel'))) {
            const userId = $('user-id').value
            const userName = $('username').value
            const password = $('password').value
            const repeated_password = $('repeat_password').value
            const roleId = $('user_role').value
            const remark = $('remark').value

            let promise

            if (userId) {
                promise = tools.fetch(`/api/users/${userId}`, {
                    method: 'put',
                    body: {
                        username: userName,
                        remark,
                        password,
                        repeated_password,
                        role_id: roleId
                    }
                })
            } else {
                promise = tools.fetch('/api/users', {
                    method: 'post',
                    body: {
                        username: userName,
                        remark,
                        password,
                        repeated_password,
                        role_id: roleId
                    }
                })
            }

            promise.then(() => success(void 0, initUserManage)).catch(failed)
        }
    })
}

function deleteRoleOrUser() {
    tools.el.setOnClick($('user-or-role-delete'), function () {
        if (tools.hidden.isVisible($('role-panel'))) {
            const roleId = $('role-id').value
    
            if (roleId) {
                tools.fetch(`/api/roles/${roleId}`, {
                    method: 'delete',
                }).then(() => success('删除成功', initUserManage)).catch(failed)
            }
        }
        if (tools.hidden.isVisible($('user-panel'))) {
            const userId = $('user-id').value
    
            if (userId) {
                tools.fetch(`/api/users/${userId}`, {
                    method: 'delete',
                }).then(() => success('删除成功', initUserManage)).catch(failed)
            }
        }
    })
}

function addRoleClick() {
    tools.el.setOnClick($('add-role'), function () {
        showRolePanel({}, true)
    })
}

function addUserClick() {
    tools.el.setOnClick($('add-user'), function () {
        showUserPanel({}, true)
    })
}

function resetPassword() {
    tools.el.setOnClick($('reset-password'), function () {
        const userId = $('user-id').value

        if (userId) {
            tools.fetch(`/api/users/reset_password/${userId}`, {
                method: 'put',
            }).then(() => success('重置成功')).catch(failed)
        }
    })
}

function lockOrUnLockUser() {
    tools.el.setOnClick($('lock_or_unlock'), function () {
        const userId = Number($('user-id').value)

        if (tools.hidden.isVisible($('user-panel')) && userId) {
            for (const role of roleTree) {
                for (const user of role.users) {
                    if (user.id === userId) {
                        let promise = user.lock_status 
                            ? tools.fetch('/api/users/unlock_username', {
                                body: { username: user.username },
                                method: 'post'
                            })
                            : tools.fetch('/api/users/lock_username', {
                                body: { username: user.username },
                                method: 'post'
                            })

                        promise.then(() => {
                            user.lock_status = !user.lock_status

                            success('修改成功')
                            updateUserLock(user, false)
                        }).catch(failed)
                        break
                    }
                }
            }
        }
    })
}

function initEvent() {
    addUserRoleMenuClick()
    addSaveClick()
    addRoleClick()
    addUserClick()
    deleteRoleOrUser()
    resetPassword()
    lockOrUnLockUser()
}

initEvent()