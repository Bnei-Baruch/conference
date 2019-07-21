import {Janus} from "../lib/janus";
import {JANUS_SRV_GXY, STUN_SRV_GXY, JANUS_ADMIN_GXY, ADMIN_SECRET} from "./consts";

export const initJanus = (cb) => {
    Janus.init({
        debug: ["log","error"],
        callback: () => {
            let janus = new Janus({
                server: JANUS_SRV_GXY,
                iceServers: [{urls: STUN_SRV_GXY}],
                success: () => {
                    Janus.log(" :: Connected to JANUS");
                    cb(janus);
                },
                error: (error) => {
                    Janus.log(error + " -- reconnect after 10 sec");
                    setTimeout(() => {
                        window.location.reload();
                    }, 10000);
                },
                destroyed: () => {
                    Janus.log(" :: Janus destroyed -- reconnect after 10 sec :: ");
                    setTimeout(() => {
                        window.location.reload();
                    }, 10000);
                }
            });
        }
    })
};

export const joinChatRoom = (textroom, roomid, user) => {
    let transaction = Janus.randomString(12);
    let register = {
        textroom: "join",
        transaction: transaction,
        room: roomid,
        username: user.id,
        display: user.display
    };
    textroom.data({
        text: JSON.stringify(register),
        error: (reason) => {
            alert(reason);
        }
    });
};

export const initChatRoom = (janus,roomid,handle,cb) => {
    var textroom = null;
    janus.attach(
        {
            plugin: "janus.plugin.textroom",
            opaqueId: "chatroom_user",
            success: (pluginHandle) => {
                textroom = pluginHandle;
                handle(textroom);
                Janus.log("Plugin attached! (" + textroom.getPlugin() + ", id=" + textroom.getId() + ")");
                // Setup the DataChannel
                let body = {"request": "setup"};
                Janus.debug("Sending message (" + JSON.stringify(body) + ")");
                textroom.send({"message": body});
            },
            error: (error) => {
                console.error("  -- Error attaching plugin...", error);
            },
            webrtcState: (on) => {
                Janus.log("Janus says our WebRTC PeerConnection is " + (on ? "up" : "down") + " now");
            },
            onmessage: (msg, jsep) => {
                Janus.debug(" ::: Got a message :::");
                Janus.debug(msg);
                if (msg["error"] !== undefined && msg["error"] !== null) {
                    alert(msg["error"]);
                }
                if (jsep !== undefined && jsep !== null) {
                    // Answer
                    textroom.createAnswer(
                        {
                            jsep: jsep,
                            media: {audio: false, video: false, data: true},	// We only use datachannels
                            success: (jsep) => {
                                Janus.debug("Got SDP!");
                                Janus.debug(jsep);
                                let body = {"request": "ack"};
                                textroom.send({"message": body, "jsep": jsep});
                            },
                            error: (error) => {
                                Janus.error("WebRTC error:", error);
                                alert("WebRTC error... " + JSON.stringify(error));
                            }
                        });
                }
            },
            ondataopen: () => {
                Janus.log("The DataChannel is available!");
                // Prompt for a display name to join the default room
                // if(roomid) {
                //     joinChatRoom(textroom,roomid,null)
                // }
            },
            ondata: (data) => {
                Janus.debug("We got data from the DataChannel! " + data);
                cb(data);
            },
            oncleanup: () => {
                Janus.log(" ::: Got a cleanup notification :::");
            }
        });
};

export const notifyMe = (title, message, tout) => {
    if (!Notification) {
        alert('Desktop notifications not available in your browser. Try Chromium.');
        return;
    }
    if (Notification.permission !== "granted")
        Notification.requestPermission();
    else {
        var notification = new Notification(title+":", {
            icon: './nlogo.png',
            body: message,
            requireInteraction: tout
        });
        notification.onclick = function () {
            window.focus();
        };
        notification.onshow = function () {
            var audio = new Audio('./plucky.mp3');
            audio.play();
        };
    }
};

export const getHiddenProp = () => {
    var prefixes = ['webkit','moz','ms','o'];
    if ('hidden' in document) return 'hidden';
    for (var i = 0; i < prefixes.length; i++){
        if ((prefixes[i] + 'Hidden') in document)
            return prefixes[i] + 'Hidden';
    }
    return null;
};

export const getDateString = (jsonDate) => {
    var when = new Date();
    if(jsonDate) {
        when = new Date(Date.parse(jsonDate));
    }
    var dateString =
        ("0" + when.getHours()).slice(-2) + ":" +
        ("0" + when.getMinutes()).slice(-2) + ":" +
        ("0" + when.getSeconds()).slice(-2);
    return dateString;
};

export const micLevel = (stream, canvas, cb) => {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    //let audioContext = null;
    //let mn = 25/128;
    let audioContext = new AudioContext();
    cb(audioContext);
    let analyser = audioContext.createAnalyser();
    let microphone = audioContext.createMediaStreamSource(stream);
    let javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

    analyser.smoothingTimeConstant = 0.8;
    analyser.fftSize = 2048;

    microphone.connect(analyser);
    analyser.connect(javascriptNode);

    javascriptNode.connect(audioContext.destination);

    let canvasContext = canvas.getContext("2d");
    let gradient = canvasContext.createLinearGradient(0,0,0,55);
    gradient.addColorStop(1,'green');
    gradient.addColorStop(0.35,'#80ff00');
    gradient.addColorStop(0.10,'orange');
    gradient.addColorStop(0,'red');

    javascriptNode.onaudioprocess = function() {
        var array = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(array);
        var values = 0;

        var length = array.length;
        for (var i = 0; i < length; i++) {
            values += (array[i]);
        }

        var average = values / length;

//          Janus.log(Math.round(average - 40));

        canvasContext.clearRect(0, 0, 15, 35);
        canvasContext.fillStyle = gradient;
        //canvasContext.fillRect(0, 35-average*mn, 15, 35);
        canvasContext.fillRect(0, 35-average, 15, 35);
    }
};

export const checkNotification = () => {
    var iOS = !!navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform);
    if ( !iOS && Notification.permission !== "granted") {
        Notification.requestPermission();
    }
};

export const getDevicesStream = (audioid,videoid,cb) => {
    //FIXME: Safari does not agree to give nHD resolution
    let height = (Janus.webRTCAdapter.browserDetails.browser === "safari") ? 480 : 360;
    let video = videoid ? { height:height,width:640,deviceId: {exact: videoid}} : "";
    let audio = audioid ? { deviceId: {exact: audioid}} : "";
    navigator.mediaDevices
        .getUserMedia({ audio: audio, video: video }).then(stream => {
        cb(stream);
    });
};

export const testDevices = (video,audio,cb) => {
    navigator.mediaDevices.getUserMedia({ audio: audio, video: video }).then(stream => {
        cb(stream);
    }, function (e) {
        var message;
        switch (e.name) {
            case 'NotFoundError':
            case 'DevicesNotFoundError':
                message = 'No input devices found.';
                break;
            case 'SourceUnavailableError':
                message = 'Your input device is busy';
                break;
            case 'PermissionDeniedError':
            case 'SecurityError':
                message = 'Permission denied!';
                break;
            default: Janus.log('Permission devices usage is Rejected! You must grant it.', e);
                return;
        }
        Janus.log(message);
    });
};

export const getData = (url, request, cb) => fetch(`${url}`,{
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body:  JSON.stringify(request)
}).then((response) => {
    if (response.ok) {
        return response.json().then(data => cb(data));
    }
})
    .catch(ex => Janus.log(`get ${url}`, ex));

export const geoInfo = (url,cb) => fetch(`${url}`)
    .then((response) => {
        if (response.ok) {
            return response.json().then(data => cb(data));
        }
    })
    .catch(ex => console.log(`get geoInfo`, ex));

export const getPublisherInfo = (session,handle,cb) => {
    if(handle === null || handle === undefined)
        return;
    let JANUS_ADMIN = JANUS_ADMIN_GXY;
    let request = { "janus": "handle_info", "transaction": Janus.randomString(12), "admin_secret": ADMIN_SECRET };
    getData(`${JANUS_ADMIN}/${session}/${handle}`,request,(json) => {
        cb(json);
    })
};

export const recordAudio = (stream) =>
    new Promise(async resolve => {
        const mediaRecorder = new MediaRecorder(stream);
        const audioChunks = [];

        mediaRecorder.addEventListener("dataavailable", event => {
            audioChunks.push(event.data);
        });

        const start = () => mediaRecorder.start();

        const stop = () =>
            new Promise(resolve => {
                mediaRecorder.addEventListener("stop", () => {
                    const audioBlob = new Blob(audioChunks);
                    const audioUrl = URL.createObjectURL(audioBlob);
                    const audio = new Audio(audioUrl);
                    const play = () => audio.play();
                    resolve({ audioBlob, audioUrl, play });
                });

                mediaRecorder.stop();
            });

        resolve({ start, stop });
    });

export const sleep = time => new Promise(resolve => setTimeout(resolve, time));

export const testMic = async (stream) => {
    const recorder = await recordAudio(stream);
    recorder.start();
    await sleep(10000);
    const audio = await recorder.stop();
    audio.play();
    await sleep(10000);
};