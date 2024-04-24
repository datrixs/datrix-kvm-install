// 屏幕录制功能
import { tools, $ } from "../tools.js";
import '../RecordRTC.js'
import '../EBML.js'

function Record(getPlayInfo, setDuration) {
    var self = this

    var __recordRTC = null
    var __canvasContext = null

    var __loop = function () {
        if (__canvasContext) {
            const [width, height, ele] = getPlayInfo()

            __canvasContext.clearRect(0, 0, width, height)
            __canvasContext.drawImage(ele, 0, 0, width, height)

            requestAnimationFrame(__loop)
        }
    }

    self.start = function () {
        const [width, height] = getPlayInfo()
        const canvas = $('recorder')
        const ctx = canvas.getContext('2d')

        canvas.width = width
        canvas.height = height
        __canvasContext = ctx

        if (!__recordRTC) {
            __recordRTC = new RecordRTC(canvas.captureStream(), {
                type: 'video',
                timeSlice: 1000,
                onTimeStamp: function(timestamp, timestamps) {
                    var duration = new Date().getTime() - timestamps[0];
                    if(duration < 0 || !__canvasContext) return;

                    setDuration(duration)
                }
            })
        }

        __loop()
        __recordRTC.reset()
        __recordRTC.startRecording()
    }
    self.stop = function () {
        __canvasContext = null
        __recordRTC.stopRecording()
    }
    self.download = function () {
        RecordRTC.getSeekableBlob(__recordRTC.getBlob(), function (blob) {
            const url = window.URL.createObjectURL(blob);
            const aEle = document.createElement("a");
            aEle.href = url;
            aEle.download = `video.webm`;
            aEle.click();
            window.URL.revokeObjectURL(url);
        })
    }
    self.clear = function () {
        self.stop()
        __recordRTC.reset()
    }
}

export function Camera(__streamer) {
    var self = this

    /**
     * 0: 等待录制中
     * 1：录制中
     * 2：停止录制
     */
    var __state = 0
    var __timer = null
    var __recorder = null

    var __isWait = function () {
        return __state === 0
    }
    var __isPending = function () {
        return __state === 1
    }
    var __isStop = function () {
        return __state === 2
    }

    var __init__ = function () {
        __recorder = new Record(__getPlayInfo, __setDuration)

        tools.el.setOnClick($("camera-record"), function () {
            tools.el.setEnabled($("camera-record"), false);
            tools.el.setEnabled($("camera-stop"), true);
            tools.el.setEnabled($("camera-clear"), true);
            tools.el.setEnabled($("camera-download"), false);
            __start()
            __recorder.start()
        });
        tools.el.setOnClick($("camera-stop"), function () {
            tools.el.setEnabled($("camera-record"), true);
            tools.el.setEnabled($("camera-stop"), false);
            tools.el.setEnabled($("camera-download"), true);
            $('camera-led').classList.toggle('led-yellow', false)
            __stop()
            __recorder.stop()
        });
        tools.el.setOnClick($("camera-clear"), function () {
            tools.el.setEnabled($("camera-record"), true);
            tools.el.setEnabled($("camera-stop"), false);
            tools.el.setEnabled($("camera-clear"), false);
            tools.el.setEnabled($("camera-download"), false);
            $('camera-time').textContent = '00:00:00'
            __clear()
            __recorder.clear()
        });
        tools.el.setOnClick($("camera-download"), function () {
            __recorder.download()
        });
    }

    var __start = function () {
        clearTimeout(__timer)
        __state = 1
        __timer = null
    }

    var __stop = function () {
        clearTimeout(__timer)
        __state = 2
        __timer = null
        $('camera-led').classList.remove('led-yellow')
    }

    var __clear = function () {
        clearTimeout(__timer)
        __state = 0
        __timer = null
    }

    var __getPlayInfo = function () {
        if (__streamer().getMode() === 'mjpeg') {
            const image = $('stream-box').querySelector('#stream-image')

            return [image.naturalWidth, image.naturalHeight, image]
        }

        const video = $('stream-box').querySelector('#stream-video')

        return [video.videoWidth, video.videoHeight, video]
    }

    var __setDuration = function (duration) {
        const time = tools.formatDuration(duration)
        const durationText = time.split('.')[0]

        $('camera-time').textContent = durationText
        $('camera-led').classList.toggle('led-yellow')
    }

    self.setEnabledOrDisabled = function (enabled) {
        if (__isWait() || __isStop()) {
            tools.el.setEnabled($("camera-record"), enabled);
        }
    }

    __init__()
}