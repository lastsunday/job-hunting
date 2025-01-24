import { BACKGROUND, CONTENT_SCRIPT, OFFSCREEN, WEB_WORKER } from "@/common/api/bridgeCommon";
import { debugLog, errorLog } from "@/common/log";

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
