import {Janus} from "../lib/janus";
import {JANUS_SRV_GXY, STUN_SRV_GXY} from "./consts";

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