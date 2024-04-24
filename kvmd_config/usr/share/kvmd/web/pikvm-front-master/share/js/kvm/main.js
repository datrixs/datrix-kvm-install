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

import { Session } from "./session.js";

export function main() {
  let session_obj = null;
  const auto = getQueryString("auto");
  // 自动登录
  if (auto == 1) {
    document.getElementById("kvm-video").style.display = "block";
    const footer = document.getElementById("kvm-footer");
    footer.style.display = "none";
  }
  setTimeout(function () {
    document.getElementById("kvm-box").style.display = "block";
  }, 200);
  if (checkBrowser()) {
    tools.storage.bindSimpleSwitch(
      $("page-close-ask-switch"),
      "page.close.ask",
      true,
      function (value) {
        if (value) {
          const page_type = getQueryString("type") || "";
          if (page_type == "1") {
            return false;
          }
          window.onbeforeunload = function (event) {
            // session_obj.glob_recorder.operation_save();
            let text = "Are you sure you want to close PiKVM session?";
            event.returnValue = text;
            return text;
          };
        } else {
          window.onbeforeunload = null;
        }
      }
    );

    initWindowManager();

    tools.el.setOnClick($("open-log-button"), () =>
      window.open("/api/log?seek=3600&follow=1", "_blank")
    );

    wm.showWindow($("stream-window"));

    session_obj = new Session();
  }

  // 展示机台
  const payload = getQueryString("payload");
  if (payload) {
    const json = JSON.parse(window.atob(payload))
    const number = decodeURIComponent(json.number || '')

    if (number) {
      $('number').textContent = `机台：${number}`
    }
  }

  // logo
  $('logo').setAttribute('href', getRedirect('/'))
}
