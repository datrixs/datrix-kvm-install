/*****************************************************************************
#                                                                            #
#    KVMD - The main PiKVM daemon.                                           #
#                                                                            #
#    Copyright (C) 2018-2022  Maxim Devaev <mdevaev@gmail.com>               #
#                                                                            #
#    This program is free software: you can redistribute it and/or modify    #
#    it under the terms of the GNU General Public License as published by    #
#    the Free Software Foundation, either version 3 of the License, or       #
#    (at your option) any later version.                                     #
#                                                                            #
#    This program is distributed in the hope that it will be useful,         #
#    but WITHOUT ANY WARRANTY; without even the implied warranty of          #
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the           #
#    GNU General Public License for more details.                            #
#                                                                            #
#    You should have received a copy of the GNU General Public License       #
#    along with this program.  If not, see <https://www.gnu.org/licenses/>.  #
#                                                                            #
*****************************************************************************/

"use strict";

import { tools, $, getQueryString, getRedirect } from "../tools.js";
import { checkBrowser } from "../bb.js";
import { wm, initWindowManager } from "../wm.js";

let loginBox = document.getElementById("login-box-out");
let videoBox = document.getElementById("video-box");

export function main() {
  const auto = getQueryString("auto"),
    redirect = getQueryString("redirect") || '/kvm';
  // 自动登录
  if (auto == 1) {
    videoBox.style.display = "block";
    $("user-input").value = "admin";
    $("passwd-input").value = "admin";
    __login(redirect);
  }
  loginBox.style.display = "block";
  if (checkBrowser()) {
    initWindowManager();

    tools.el.setOnClick($("login-button"), () => __login(redirect));
    $("user-input").onkeyup = $("passwd-input").onkeyup = function (event) {
      if (event.code === "Enter") {
        event.preventDefault();
        $("login-button").click();
      }
    };

    $("user-input").focus();
  }
}

function __login(path) {
  let user = $("user-input").value;
  if (user.length === 0) {
    $("user-input").focus();
  } else {
    let passwd = $("passwd-input").value;
    let body = `user=${encodeURIComponent(user)}&passwd=${encodeURIComponent(
      passwd
    )}`;
    let http = tools.makeRequest(
      "POST",
      "/api/auth/login",
      function () {
        if (http.readyState === 4) {
          if (http.status === 200) {
            // setToken
            tools.setToken(http.getResponseHeader('auth_token'))
            if (path) {
              console.log(path);
              document.location.href = getRedirect(path);
            } else {
              document.location.href = getRedirect('/');
            }
          } else if (http.status === 403) {
            videoBox.style.display = "none";
            loginBox.style.display = "block";
            wm.error("用户名或密码无效").then(__tryAgain);
          } else {
            let error = "";
            let errorMsg = ''
            if (http.status === 400) {
              try {
                const json = JSON.parse(http.responseText)

                error = json["result"]["error"];
                errorMsg = json.result.error_msg
              } catch (_) {
                /* Nah */
              }
            }
            if (error === "ValidatorError") {
              wm.error("用户名或密码字符无效").then(
                __tryAgain
              );
            } else {
              wm.error("登录错误:<br>", errorMsg || http.responseText).then(__tryAgain);
            }
            videoBox.style.display = "none";
            loginBox.style.display = "block";
          }
        }
      },
      body,
      "application/x-www-form-urlencoded"
    );
    __setEnabled(false);
  }
}

function __setEnabled(enabled) {
  tools.el.setEnabled($("user-input"), enabled);
  tools.el.setEnabled($("passwd-input"), enabled);
  tools.el.setEnabled($("login-button"), enabled);
}

function __tryAgain() {
  __setEnabled(true);
  $("passwd-input").focus();
  $("passwd-input").select();
}
