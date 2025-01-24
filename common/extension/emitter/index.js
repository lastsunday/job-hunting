import { EmitterApi } from "@/common/api";
import { WEB_WORKER } from "@/common/api/bridgeCommon";
import App, { WORLD_WEB_WORKER } from "@/common/extension/app";
const Emitter = (() => {

    const eventCallbackMap = new Map();

    const initMethod = () => {
        if (App.isWorld(WORLD_WEB_WORKER)) {
            //skip
        } else {
            chrome.storage.onChanged.addListener((changes, namespace) => {
                for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
                    if (eventCallbackMap.has(key)) {
                        const list = eventCallbackMap.get(key);
                        list.forEach(item => {
                            item(newValue);
                        });
                    }
                }
            });
        }
    }

    initMethod();

    const api = {

        /**
         * 
         * @param {string} key 
         * @param {(any)=>void} callback 
         */
        on: (key, callback) => {
            if (!eventCallbackMap.has(key)) {
                eventCallbackMap.set(key, []);
            }
            eventCallbackMap.get(key).push(callback);
        },

        remove: (key, callback) => {
            if (eventCallbackMap.has(key)) {
                let list = eventCallbackMap.get(key);
                let index = list.indexOf(callback)
                if (index != -1) {
                    list.splice(index, 1);
                }
            }
        },

        emit: async (key, value) => {
            const obj = {};
            obj[key] = value;
            if (App.isWorld(WORLD_WEB_WORKER)) {
                await EmitterApi.emitterEmit(obj)
            } else {
                await chrome.storage.local.set(obj);
            }
        }
    }

    return api;

})();

export default Emitter;