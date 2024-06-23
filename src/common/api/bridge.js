import { debugLog, errorLog } from "../log";
import { CONTENT_SCRIPT, BACKGROUND, OFFSCREEN } from "./bridgeCommon.js";
import { v4 as uuidv4 } from "uuid";

export const EVENT_BRIDGE = "EVENT_BRIDGE";

const callbackPromiseHookMap = new Map();

/**
 *
 * @param {string} action 通过传入src/offscreen/worker.js里的WorkerBridge的方法名，实现方法的调用
 * @param {*} param 所需要传递的调用参数，在被调用方法的param参数中有体现
 * @param function onMessageCallback 返回message信息的回调函数
 * @returns
 */
export function invoke(
  action,
  param,
  { onMessageCallback, invokeEnv } = { invokeEnv: CONTENT_SCRIPT }
) {
  let callbackId = genCallbackId();
  let promise = new Promise((resolve, reject) => {
    try {
      addCallbackPromiseHook(callbackId, { resolve, reject });
      let message = {
        action,
        callbackId,
        param,
        from: CONTENT_SCRIPT,
        to: BACKGROUND,
        invokeEnv: invokeEnv,
      };
      if (onMessageCallback) {
        onMessageCallback(message);
      }
      if (invokeEnv == CONTENT_SCRIPT) {
        debugLog(
          "1.[content script][send][" +
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
      } else if (invokeEnv == BACKGROUND) {
        message.from = BACKGROUND;
        message.to = OFFSCREEN;
        debugLog(
          "1.[background script][send][" +
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
        try {
          //for firefox hack
          if (window) {
            const event = new CustomEvent(EVENT_BRIDGE, { detail: message });
            window.dispatchEvent(event);
          }
        } catch (e) {
          //skip
        }
      } else {
        reject(`unknow invokeEnv = ${invokeEnv}`);
      }
    } catch (e) {
      errorLog(e);
      reject(e);
    }
  });
  return promise;
}

export function init() {
  chrome.runtime.onMessage.addListener(function (result, sender, sendResponse) {
    let message = result;
    if (message.from == BACKGROUND && message.to == CONTENT_SCRIPT) {
      //message = {action,callbackId,param,data,error}
      debugLog(
        "12.[content script][receive][" +
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
    }
  });
}

function addCallbackPromiseHook(callbackId, promiseHook) {
  callbackPromiseHookMap.set(callbackId, promiseHook);
}

export function getAndRemovePromiseHook(callbackId) {
  let promiseHook = callbackPromiseHookMap.get(callbackId);
  callbackPromiseHookMap.delete(callbackId);
  return promiseHook;
}

function genCallbackId() {
  return uuidv4();
}
