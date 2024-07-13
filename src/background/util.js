import { debugLog, errorLog } from "../common/log";
import { CONTENT_SCRIPT, BACKGROUND } from "../common/api/bridgeCommon";

export function postSuccessMessage(message, data) {
    message.from = BACKGROUND;
    message.to = CONTENT_SCRIPT;
    debugLog(
        "3.[background][send][" +
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
    message.from = BACKGROUND;
    message.to = CONTENT_SCRIPT;
    errorLog(
        "3.[background][send][" +
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
