import { isDevEnv } from "@/common";
import { getAndRemovePromiseHook } from "@/common/api/bridge";
import { BACKGROUND, CONTENT_SCRIPT, OFFSCREEN, WEB_WORKER } from "@/common/api/bridgeCommon";
import { INVOKE_WARN_TIME_COST } from "@/common/config";
import { debugLog, errorLog, warnLog } from "@/common/log";

/**
 * [ContentScript] <-(message) [this@[Background]] (message)-> [OffScreen]
 */
export function postSuccessMessage(message, data) {
    if (message.invokeEnv == WEB_WORKER) {
        message.from = BACKGROUND;
        message.to = OFFSCREEN;
    } else {
        message.from = BACKGROUND;
        message.to = CONTENT_SCRIPT;
    }
    debugLog(
        "[Message][send][" +
        message.from +
        " -> " +
        message.to +
        "] message [action=" +
        message.action +
        ",invokeEnv=" +
        message.invokeEnv +
        ",callbackId=" +
        message.callbackId +
        ",error=" +
        message.error +
        "]"
    );
    let resultMessage = JSON.parse(JSON.stringify(message));
    resultMessage.data = data;
    if (message.tabId) {
        //content script invoke
        chrome.tabs.sendMessage(message.tabId, resultMessage);
    } else {
        //other invoke
        //Note that extensions cannot send messages to content scripts using this method. To send messages to content scripts, use tabs.sendMessage.
        chrome.runtime.sendMessage(resultMessage);
    }
}

/**
 * [ContentScript] <-(message) [this@[Background]] (message)-> [OffScreen]
 */
export function postErrorMessage(message, error) {
    if (message.invokeEnv == WEB_WORKER) {
        message.from = BACKGROUND;
        message.to = OFFSCREEN;
    } else {
        message.from = BACKGROUND;
        message.to = CONTENT_SCRIPT;
    }
    errorLog(
        "[Message][send][" +
        message.from +
        " -> " +
        message.to +
        "] message [action=" +
        message.action +
        ",invokeEnv=" +
        message.invokeEnv +
        ",callbackId=" +
        message.callbackId +
        ",error=" +
        message.error +
        "]"
    );
    if (message.tabId) {
        //content script invoke
        chrome.tabs.sendMessage(message.tabId, message);
    } else {
        //other invoke
        //Note that extensions cannot send messages to content scripts using this method. To send messages to content scripts, use tabs.sendMessage.
        chrome.runtime.sendMessage(message);
    }
}

export const onMessageHandle = (message, sender, actionFunction) => {
    if (message) {
        if (isDevEnv()) {
            const time = new Date().getTime();
            message.invokeTimeList.push({ env: BACKGROUND, time, offset: time - message.invokeTimeList.slice(-1)[0].time });
        }
        if (message.from == CONTENT_SCRIPT && message.to == BACKGROUND) {
            //get the tab id from content script page,not the extension page(eg: sidepanel)
            if (sender.tab) {
                message.tabId = sender.tab.id;
            }
            debugLog(
                "[Message][receive][" +
                message.from +
                " -> " +
                message.to +
                "] message [action=" +
                message.action +
                ",invokeEnv=" +
                message.invokeEnv +
                ",callbackId=" +
                message.callbackId +
                ",error=" +
                message.error +
                "]"
            );
            let action = message.action;
            if (actionFunction.has(action)) {
                debugLog("[background] invoke action = " + action);
                actionFunction.get(action)(message, message.param);
            } else {
                message.from = BACKGROUND;
                message.to = OFFSCREEN;
                debugLog(
                    "[Message][send][" +
                    message.from +
                    " -> " +
                    message.to +
                    "] message [action=" +
                    message.action +
                    ",invokeEnv=" +
                    message.invokeEnv +
                    ",callbackId=" +
                    message.callbackId +
                    ",error=" +
                    message.error +
                    "]"
                );
                chrome.runtime.sendMessage(message);
            }
        } else if (message.from == OFFSCREEN && message.to == BACKGROUND) {
            const invokeEnv = message.invokeEnv;
            debugLog(
                "[Message][receive][" +
                message.from +
                " -> " +
                message.to +
                "] message [action=" +
                message.action +
                ",invokeEnv=" +
                invokeEnv +
                ",callbackId=" +
                message.callbackId +
                ",error=" +
                message.error +
                "]"
            );
            if (invokeEnv == CONTENT_SCRIPT) {
                message.from = BACKGROUND;
                message.to = CONTENT_SCRIPT;
                debugLog(
                    "[Message][send][" +
                    message.from +
                    " -> " +
                    message.to +
                    "] message [action=" +
                    message.action +
                    ",invokeEnv=" +
                    invokeEnv +
                    ",callbackId=" +
                    message.callbackId +
                    ",error=" +
                    message.error +
                    "]"
                );
                if (message.tabId) {
                    //content script invoke
                    chrome.tabs.sendMessage(message.tabId, message);
                } else {
                    //other invoke
                    //Note that extensions cannot send messages to content scripts using this method. To send messages to content scripts, use tabs.sendMessage.
                    chrome.runtime.sendMessage(message);
                }
            } else if (invokeEnv == BACKGROUND) {
                if (isDevEnv()) {
                    let costTime = message.invokeTimeList.slice(-1)[0].time - message.invokeTimeList.slice(0, 1)[0].time;
                    if (costTime > INVOKE_WARN_TIME_COST) {
                        //invoke > warnTimeCost to show warning
                        warnLog(`[${invokeEnv}][${message.invokeSeq}]Invoke [${message.action}] cost time = %c${costTime.toFixed(2)}ms`, `color:white;background-color:hsl(360 ${costTime / 100} 50%);`, message.invokeTimeList, message);
                    }
                }
                let promiseHook = getAndRemovePromiseHook(message.callbackId);
                if (promiseHook) {
                    if (message.error) {
                        message.message = message.error;
                        promiseHook.reject(message);
                    } else {
                        promiseHook.resolve(message);
                    }
                } else {
                    errorLog(
                        `callbackId = ${message.callbackId} lost callback promiseHook`
                    );
                }
            } else if (invokeEnv == WEB_WORKER) {
                debugLog(
                    "[Message][receive][" +
                    message.from +
                    " -> " +
                    message.to +
                    "] message [action=" +
                    message.action +
                    ",invokeEnv=" +
                    invokeEnv +
                    ",callbackId=" +
                    message.callbackId +
                    ",error=" +
                    message.error +
                    "]"
                );
                let action = message.action;
                debugLog("[background] invoke action = " + action);
                actionFunction.get(action)(message, message.param);
            }
        }
    }
}
