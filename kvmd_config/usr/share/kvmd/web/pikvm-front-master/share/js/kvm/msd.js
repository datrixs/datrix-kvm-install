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


import {tools, $, $$$} from "../tools.js";
import {wm} from "../wm.js";


export function Msd() {
	var self = this;

	/************************************************************************/

	var __state = null;
	var __http = null;
	var __files = []
	var __multiUploading = false

	var __init__ = function() {
		$("msd-led").title = "Unknown state";

		$("msd-image-selector").onchange = __selectImage;
		tools.el.setOnClick($("msd-download-button"), __clickDownloadButton);
		tools.el.setOnClick($("msd-remove-button"), __clickRemoveButton);

		tools.radio.setOnClick("msd-mode-radio", __clickModeRadio);

		tools.el.setOnClick($("msd-rw-switch"), __clickRwSwitch);

		tools.el.setOnClick($("msd-select-new-button"), __toggleSelectSub);
		$("msd-new-file").onchange = __selectNewFile;
		$("msd-new-url").oninput = __selectNewUrl;

		tools.el.setOnClick($("msd-upload-new-button"), __clickUploadNewButton);
		tools.el.setOnClick($("msd-abort-new-button"), __clickAbortNewButton);

		tools.el.setOnClick($("msd-connect-button"), () => __clickConnectButton(true));
		tools.el.setOnClick($("msd-disconnect-button"), () => __clickConnectButton(false));

		tools.el.setOnClick($("msd-reset-button"), __clickResetButton);
		$("msd-upload").onchange = __selectUploadFile;
		tools.el.setOnClick($("msd-file-list"), __clickRemoveFile, true, true);
		tools.el.setOnClick($("msd-upload-file"), __clickToUpload);
	};

	/************************************************************************/

	self.setState = function(state) {
		__state = state;
		if (__multiUploading) __state.busy = true
		__applyState();
	};

	var __selectImage = function() {
		tools.el.setEnabled($("msd-image-selector"), false);
		tools.el.setEnabled($("msd-download-button"), false);
		tools.el.setEnabled($("msd-remove-button"), false);
		__sendParam("image", $("msd-image-selector").value);
	};

	var __clickDownloadButton = function() {
		let name = $("msd-image-selector").value;
		window.open(`/api/msd/read?image=${name}&auth_token=${tools.auth_token}`);
	};

	var __clickRemoveButton = function() {
		let name = $("msd-image-selector").value;
		wm.confirm(`Are you sure you want to remove the image<br><b>${name}</b> from PiKVM?`).then(function(ok) {
			if (ok) {
				let http = tools.makeRequest("POST", `/api/msd/remove?image=${name}`, function() {
					if (http.readyState === 4) {
						if (http.status !== 200) {
							wm.error("Can't remove image:<br>", http.responseText);
						}
					}
				});
			}
		});
	};

	var __clickModeRadio = function() {
		__sendParam("cdrom", tools.radio.getValue("msd-mode-radio"));
	};

	var __clickRwSwitch = function() {
		__sendParam("rw", $("msd-rw-switch").checked);
		__toggleUploadArea()
	};

	var __sendParam = function(name, value) {
		let http = tools.makeRequest("POST", `/api/msd/set_params?${name}=${encodeURIComponent(value)}`, function() {
			if (http.readyState === 4) {
				if (http.status !== 200) {
					wm.error("无法配置 MSD:<br>", http.responseText);
				}
			}
		});
	};

	var __toggleUploadArea = function () {
		const checked = $("msd-rw-switch").checked

		tools.feature.setEnabled($('msd-upload-area'), checked)
		tools.feature.setEnabled($('msd-upload-file'), checked)
		tools.el.setEnabled($('msd-upload-file'), false)
	}

	var __selectUploadFile = function () {
		let files = tools.input.getFiles($("msd-upload"));

		if (files) {
			const result = []

			for (const f of files) {
				if (__files.every(i => i.name !== f.name && i.size !== f.size)) {
					result.push(f)
				}
			}
			__files = __files.concat(result)
			__updateFileList()
		}
	}

	var __updateFileList = function () {
		$('msd-file-list').innerHTML = __files.map((f, i) => {
			return `
			<li>
				<img data-index=${i} class="led-gray" data-dont-hide-menu id="msd-led" src="/share/svg/close.svg">
				${f.name}
			</li>
			`
		}).join('')
		console.log('__files.length > 0',__files.length > 0);
		tools.el.setEnabled($('msd-upload-file'), __files.length > 0)
	}

	var __clickRemoveFile = function (e) {
		const target = e.target
		const index = target.dataset.index

		if (index) {
			__files.splice(Number(index), 1)
			__updateFileList()
		}
	}

	var __clickToUpload = function () {
		const upload = function (file) {
			return new Promise(function (resolve, reject) {
				const http = new XMLHttpRequest();

				http.open("POST", `/api/msd/write?image=${encodeURIComponent(file.name)}&remove_incomplete=1`, true);
				http.upload.timeout = 7 * 24 * 3600;
				http.onreadystatechange = function () {
					httpStateChange(http)
					if (http.readyState === 4) {
						if (http.status === 200) {
						  resolve(http.response)
						} else {
						  reject(http)
						}
					}
				};
				if (tools.auth_token) {
					http.setRequestHeader("Authorization", tools.auth_token);
				}
				http.send(file);
			})
		}
		const serial = function (list) {
			const first = list[0]
			const last = list[list.length - 1]

			return new Promise(function (resolve, reject) {
				const task = function () {
					const file = list.shift()

					if (file === first) __multiUploading = true
					if (file === last) __multiUploading = false
					if (!file) return resolve()

					upload(file).then(task).catch(reject)
				}
				

				task()
			})
		}
		serial(__files.slice())
		.then(function () {
			$('msd-connect-button').click()
		})
		.finally(function () {
			__files = []
			__updateFileList()
			$('msd-upload').value = ''
		})
	}

	var httpStateChange = function(http) {
		if (http.readyState === 4) {
			if (http.status !== 200) {
				wm.error("无法将镜像上载到大容量存储驱动器:<br>", http.responseText);
			} else if ($("msd-new-url").value.length > 0) {
				let msg = "";
				try {
					let end = http.responseText.lastIndexOf("\r\n");
					if (end < 0) {
						console.log(1);
						end = http.responseText.length;
					}
					let begin = http.responseText.lastIndexOf("\r\n", end - 2);
					if (begin < 0) {
						end = 0;
					}
					let result_str = http.responseText.slice(begin, end);
					let result = JSON.parse(result_str);
					if (!result.ok) {
						msg = `无法将镜像上载到大容量存储驱动器:<br>${result_str}`;
					}
				} catch (err) {
					msg = `无法分析上传结果:<br>${err}`;
				}
				if (msg.length > 0) {
					wm.error(msg);
				}
			}
		}
	};

	var __clickUploadNewButton = function() {
		let file = tools.input.getFile($("msd-new-file"));
		__http = new XMLHttpRequest();
		if (file) {
			__http.open("POST", `/api/msd/write?image=${encodeURIComponent(file.name)}&remove_incomplete=1`, true);
		} else {
			let url = $("msd-new-url").value;
			__http.open("POST", `/api/msd/write_remote?url=${encodeURIComponent(url)}&remove_incomplete=1`, true);
		}
		__http.upload.timeout = 7 * 24 * 3600;
		__http.onreadystatechange = __httpStateChange;
		if (tools.auth_token) {
			__http.setRequestHeader("Authorization", tools.auth_token);
		}
		__http.send(file);
		__applyState();
	};

	var __httpStateChange = function() {
		if (__http.readyState === 4) {
			if (__http.status !== 200) {
				wm.error("Can't upload image to the Mass Storage Drive:<br>", __http.responseText);
			} else if ($("msd-new-url").value.length > 0) {
				let msg = "";
				try {
					let end = __http.responseText.lastIndexOf("\r\n");
					if (end < 0) {
						console.log(1);
						end = __http.responseText.length;
					}
					let begin = __http.responseText.lastIndexOf("\r\n", end - 2);
					if (begin < 0) {
						end = 0;
					}
					let result_str = __http.responseText.slice(begin, end);
					let result = JSON.parse(result_str);
					if (!result.ok) {
						msg = `Can't upload image to the Mass Storage Drive:<br>${result_str}`;
					}
				} catch (err) {
					msg = `Can't parse upload result:<br>${err}`;
				}
				if (msg.length > 0) {
					wm.error(msg);
				}
			}
			tools.hidden.setVisible($("msd-new-sub"), false);
			$("msd-new-file").value = "";
			$("msd-new-url").value = "";
			__http = null;
			__applyState();
		}
	};

	var __clickAbortNewButton = function() {
		__http.onreadystatechange = null;
		__http.abort();
		__http = null;
		tools.progress.setValue($("msd-uploading-progress"), "Aborted", 0);
	};

	var __clickConnectButton = function(connected) {
		let http = tools.makeRequest("POST", `/api/msd/set_connected?connected=${connected}`, function() {
			if (http.readyState === 4) {
				if (http.status !== 200) {
					wm.error("Switch error:<br>", http.responseText);
				}
			}
			__applyState();
		});
		__applyState();
		tools.el.setEnabled($(`msd-${connected ? "connect" : "disconnect"}-button`), false);
	};

	var __clickResetButton = function() {
		wm.confirm("是否确实要重置大容量存储驱动器？").then(function(ok) {
			if (ok) {
				let http = tools.makeRequest("POST", "/api/msd/reset", function() {
					if (http.readyState === 4) {
						if (http.status !== 200) {
							wm.error("MSD 重置错误:<br>", http.responseText);
						}
					}
					__applyState();
				});
				__applyState();
			}
		});
	};

	var __toggleSelectSub = function() {
		let el_sub = $("msd-new-sub");
		let visible = tools.hidden.isVisible(el_sub);
		if (visible) {
			$("msd-new-file").value = "";
			$("msd-new-url").value = "";
		}
		tools.hidden.setVisible(el_sub, !visible);
		__applyState();
	};

	var __selectNewFile = function() {
		let el_input = $("msd-new-file");
		let file = tools.input.getFile($("msd-new-file"));
		if (file) {
			$("msd-new-url").value = "";
			if (file.size > __state.storage.size) {
				wm.error("New image is too big for your Mass Storage Drive.<br>Maximum:", tools.formatSize(__state.storage.size));
				el_input.value = "";
			}
		}
		__applyState();
	};

	var __selectNewUrl = function() {
		if ($("msd-new-url").value.length > 0) {
			$("msd-new-file").value = "";
		}
		__applyState();
	};

	var __applyState = function() {
		__applyStateFeatures();
		__applyStateStatus();

		let s = __state;
		let online = (s && s.online);

		$("msd-image-name").innerHTML = ((online && s.drive.image) ? s.drive.image.name : "None");
		$("msd-image-size").innerHTML = ((online && s.drive.image) ? tools.formatSize(s.drive.image.size) : "None");
		if (online) {
			let size_str = tools.formatSize(s.storage.size);
			let used = s.storage.size - s.storage.free;
			let used_str = tools.formatSize(used);
			$("msd-storage-size").innerHTML = size_str;
			tools.progress.setValue($("msd-storage-progress"), `Storage: ${used_str} of ${size_str}`, used / s.storage.size * 100);
		} else {
			$("msd-storage-size").innerHTML = "Unavailable";
			tools.progress.setValue($("msd-storage-progress"), "Storage: unavailable", 0);
		}

		tools.el.setEnabled($("msd-image-selector"), (online && s.features.multi && !s.drive.connected && !s.busy));
		__applyStateImageSelector();
		tools.el.setEnabled($("msd-download-button"), (online && s.features.multi && s.drive.image && !s.drive.connected && !s.busy));
		tools.el.setEnabled($("msd-remove-button"), (online && s.features.multi && s.drive.image && !s.drive.connected && !s.busy));

		tools.radio.setEnabled("msd-mode-radio", (online && s.features.cdrom && !s.drive.connected && !s.busy));
		tools.radio.setValue("msd-mode-radio", `${Number(online && s.features.cdrom && s.drive.cdrom)}`);

		tools.el.setEnabled($("msd-rw-switch"), (online && s.features.rw && !s.drive.connected && !s.busy));
		$("msd-rw-switch").checked = (online && s.features.rw && s.drive.rw);
		
		const connectBtnEnabled = (online && (!s.features.multi || s.drive.image) && !s.drive.connected && !s.busy)
		tools.el.setEnabled($("msd-connect-button"), connectBtnEnabled);
		tools.el.setEnabled($("msd-disconnect-button"), (online && s.drive.connected && !s.busy));

		__toggleUploadArea()
		tools.el.setEnabled($('msd-upload'), connectBtnEnabled)
		tools.el.setEnabled($('msd-upload-file'), connectBtnEnabled && __files.length > 0)

		tools.el.setEnabled($("msd-select-new-button"), (online && !s.drive.connected && !__http && !s.busy));
		tools.el.setEnabled($("msd-upload-new-button"),
			(online && !s.drive.connected && (tools.input.getFile($("msd-new-file")) || $("msd-new-url").value.length > 0) && !s.busy));
		tools.el.setEnabled($("msd-abort-new-button"), (online && __http));

		tools.el.setEnabled($("msd-reset-button"), (s && s.enabled && !s.busy));

		tools.el.setEnabled($("msd-new-file"), (online && !s.drive.connected && !__http && !s.busy));
		tools.el.setEnabled($("msd-new-url"), (online && !s.drive.connected && !__http && !s.busy));

		// tools.hidden.setVisible($("msd-uploading-sub"), (online && s.storage.uploading));
		$("msd-uploading-name").innerHTML = ((online && s.storage.uploading) ? s.storage.uploading.name : "");
		$("msd-uploading-size").innerHTML = ((online && s.storage.uploading) ? tools.formatSize(s.storage.uploading.size) : "");
		if (online) {
			if (s.storage.uploading) {
				let percent = Math.round(s.storage.uploading.written * 100 / s.storage.uploading.size);
				tools.progress.setValue($("msd-uploading-progress"), `${percent}%`, percent);
			} else if (!__http) {
				tools.progress.setValue($("msd-uploading-progress"), "Waiting for upload (press UPLOAD button) ...", 0);
			}
		} else {
			$("msd-new-file").value = "";
			$("msd-new-url").value = "";
			tools.progress.setValue($("msd-uploading-progress"), "", 0);
		}
	};

	var __applyStateFeatures = function() {
		let s = __state;
		let online = (s && s.online);

		if (s) {
			tools.feature.setEnabled($("feature-msd-line"), s.enabled);
			tools.feature.setEnabled($("msd-dropdown"), s.enabled);
			tools.feature.setEnabled($("msd-reset-button"), s.enabled);
			for (let el of $$$(".msd-single-storage")) {
				// tools.feature.setEnabled(el, !s.features.multi);
				tools.feature.setEnabled(el, false);
			}
			for (let el of $$$(".msd-multi-storage")) {
				// tools.feature.setEnabled(el, s.features.multi);
				tools.feature.setEnabled(el, false);
			}
			for (let el of $$$(".msd-cdrom-emulation")) {
				// tools.feature.setEnabled(el, s.features.cdrom);
				tools.feature.setEnabled(el, false);
			}
			for (let el of $$$(".msd-rw")) {
				// tools.feature.setEnabled(el, s.features.rw);
				tools.feature.setEnabled(el, false);
			}
			tools.feature.setEnabled($("msd-multi-storage-progress"), true);
		}

		// tools.hidden.setVisible($("msd-message-offline"), (s && !s.online));
		// tools.hidden.setVisible($("msd-message-image-broken"),
		// 	(online && s.drive.image && !s.drive.image.complete && !s.storage.uploading));
		// tools.hidden.setVisible($("msd-message-too-big-for-cdrom"),
		// 	(online && s.features.cdrom && s.drive.cdrom && s.drive.image && s.drive.image.size >= 2359296000));
		// tools.hidden.setVisible($("msd-message-out-of-storage"),
		// 	(online && s.features.multi && s.drive.image && !s.drive.image.in_storage));
		// tools.hidden.setVisible($("msd-message-rw-enabled"),
		// 	(online && s.features.rw && s.drive.rw));
		// tools.hidden.setVisible($("msd-message-another-user-uploads"),
		// 	(online && s.storage.uploading && !__http));
		// tools.hidden.setVisible($("msd-message-downloads"),
		// 	(online && s.features.multi && s.storage.downloading));
	};

	var __applyStateStatus = function() {
		let s = __state;
		let online = (s && s.online);

		let led_cls = "led-gray";
		let msg = "Unavailable";

		if (online && s.drive.connected) {
			led_cls = "led-green";
			msg = "Connected to Server";
		} else if (online && s.storage.uploading) {
			led_cls = "led-yellow-rotating-fast";
			msg = "Uploading new image";
		} else if (online && s.features.multi && s.storage.downloading) {
			led_cls = "led-yellow-rotating-fast";
			msg = "Serving the image to download";
		} else if (online) { // Sic!
			msg = "Disconnected";
		}

		$("msd-led").className = led_cls;
		$("msd-status").innerHTML = $("msd-led").title = msg;
	};

	var __applyStateImageSelector = function() {
		let s = __state;
		let online = (s && s.online);
		let el = $("msd-image-selector");

		if (!online) {
			el.options.length = 1; // Cleanup
			return;
		}
		if (!s.features.multi || s.storage.uploading || s.storage.downloading) {
			return;
		}

		if (el.options.length === 0) {
			el.options[0] = new Option("~ Not selected ~", "", false, false);
		} else {
			el.options.length = 1;
		}

		let precom = "\xA0\xA0\xA0\xA0\xA0\u21b3";
		let selected_index = 0;
		let index = 1;

		for (let name of Object.keys(s.storage.images).sort()) {
			let image = s.storage.images[name];

			let separator = new Option("\u2500".repeat(30), false, false);
			separator.disabled = true;
			separator.className = "comment";
			el.options[index] = separator;
			++index;

			let option = new Option(name, name, false, false);
			el.options[index] = option;
			if (s.drive.image && s.drive.image.name === name && s.drive.image.in_storage) {
				selected_index = index;
			}
			++index;

			let comment = new Option(`${precom} ${tools.formatSize(image.size)}${image.complete ? "" : ", broken"}`, "", false, false);
			comment.disabled = true;
			comment.className = "comment";
			el.options[index] = comment;
			++index;
		}

		if (s.drive.image && !s.drive.image.in_storage) {
			el.options[index] = new Option(s.drive.image.name, "", false, false);
			el.options[index + 1] = new Option(`${precom} ${tools.formatSize(s.drive.image.size)}, out of storage`, "", false, false);
			selected_index = el.options.length - 2;
		}

		el.selectedIndex = selected_index;
	};

	__init__();
}
