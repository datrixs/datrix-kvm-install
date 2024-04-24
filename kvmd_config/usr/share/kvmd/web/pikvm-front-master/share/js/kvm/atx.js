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


import {tools, $} from "../tools.js";
import {wm} from "../wm.js";


export function Atx(__recorder) {
	var self = this;

	/************************************************************************/

	var __init__ = function() {
		$("atx-power-led").title = "Power Led";
		$("atx-hdd-led").title = "Disk Activity Led";

		tools.storage.bindSimpleSwitch($("atx-ask-switch"), "atx.ask", true);

		for (let args of [
			["atx-power-button", "power", "确定按下电源键？"],
			["atx-power-button-long", "power_long", `
				确定长按电源键？<br>
				警告！这可能会导致服务器上的数据丢失。
			`],
			["atx-reset-button", "reset", `
				确定按下重启键？<br>
				警告！这可能会导致服务器上的数据丢失。
			`],
		]) {
			tools.el.setOnClick($(args[0]), () => __clickButton(args[1], args[2]));
		}
	};

	/************************************************************************/

	self.setState = function(state) {
		let buttons_enabled = false;
		if (state) {
			tools.feature.setEnabled($("atx-dropdown"), state.enabled);
			$("atx-power-led").className = (state.busy ? "led-yellow" : (state.leds.power ? "led-green" : "led-gray"));
			$("atx-hdd-led").className = (state.leds.hdd ? "led-red" : "led-gray");
			buttons_enabled = !state.busy;
		} else {
			$("atx-power-led").className = "led-gray";
			$("atx-hdd-led").className = "led-gray";
		}
		for (let id of ["atx-power-button", "atx-power-button-long", "atx-reset-button"]) {
			tools.el.setEnabled($(id), buttons_enabled);
		}
	};

	var __clickButton = function(button, confirm_msg) {
		let click_button = function() {
			let http = tools.makeRequest("POST", `/api/atx/click?button=${button}`, function() {
				if (http.readyState === 4) {
					if (http.status === 409) {
						wm.error("正在为其他客户端执行另一个ATX操作。<br>请稍后再试");
					} else if (http.status !== 200) {
						wm.error("操作失败:<br>", http.responseText);
					}
				}
			});
			__recorder.recordAtxButtonEvent(button);
		};

		if ($("atx-ask-switch").checked) {
			wm.confirm(confirm_msg).then(function(ok) {
				if (ok) {
					click_button();
				}
			});
		} else {
			click_button();
		}
	};

	__init__();
}
