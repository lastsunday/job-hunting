import { v4 as uuidv4 } from "uuid";
import { isDevEnv } from "../../common";
import { INVOKE_WARN_TIME_COST } from "../config.js";
import { debugLog, errorLog, warnLog } from "../log";
import { BACKGROUND, CONTENT_SCRIPT, OFFSCREEN, WEB_WORKER, getInvokeEnv } from "./bridgeCommon.js";

export const EVENT_BRIDGE = "EVENT_BRIDGE";

const callbackPromiseHookMap = new Map();

let invokeSeq = 0;

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
  { onMessageCallback = null, invokeEnv = null } = {}
) {
  invokeEnv ??= getInvokeEnv();
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
        invokeEnv,
      };
      if (isDevEnv()) {
        message.invokeTimeList = [{ env: invokeEnv, time: new Date().getTime(), offset: 0 }];
        message.invokeSeq = invokeSeq++;
      }
      if (onMessageCallback) {
        onMessageCallback(message);
      }
      if (invokeEnv == CONTENT_SCRIPT) {
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
      } else if (invokeEnv == BACKGROUND) {
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
      } else if (invokeEnv == WEB_WORKER) {
        message.from = WEB_WORKER;
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
      } else {
        reject(`unknow invokeEnv = ${invokeEnv}`);
        return;
      }
      sendMessage(message);
    } catch (e) {
      errorLog(e);
      reject(e);
    }
  });
  return promise;
}

const chunkSize = 1024 * 1024 * 50;

async function sendMessage(message) {
  let param = message.param;
  if (typeof param === 'string' && param.length > chunkSize) {
    let resultLength = param.length;
    let chunkTotal = parseInt(resultLength / chunkSize);
    if (resultLength % chunkSize > 0) {
      chunkTotal += 1;
    }
    for (let i = 0; i < chunkTotal; i++) {
      let currentLength = i * chunkSize;
      let chunk = i + 1;
      message.chunk = chunk;
      message.chunkTotal = chunkTotal;
      if (chunk == chunkTotal) {
        //last chunk
        message.param = param.slice(currentLength, resultLength);
        await _sendMessage(message);
      } else {
        let nextLength = chunk * chunkSize;
        message.param = param.slice(currentLength, nextLength);
        await _sendMessage(message);
      }
    }
  } else {
    await _sendMessage(message);
  }
}

async function _sendMessage(message) {
  if (message.invokeEnv == WEB_WORKER) {
    postMessage({ data: message });
  } else {
    await chrome.runtime.sendMessage(message);
  }
}

const callbackIdAndDataMap = new Map();

export function init() {
  chrome.runtime.onMessage.addListener(function (result, sender, sendResponse) {
    const message = result;
    if (message.from == BACKGROUND && message.to == CONTENT_SCRIPT) {
      handle(message);
    }
  });
}

export function handle(message) {
  let callbackId = message.callbackId;
  if (isDevEnv()) {
    const time = new Date().getTime();
    message.invokeTimeList.push({ env: CONTENT_SCRIPT, time, offset: time - message.invokeTimeList.slice(-1)[0].time });
  }
  //message = {action,callbackId,param,data,error}
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
    callbackId +
    ",error=" +
    message.error +
    "]"
  );
  let chunk = message.chunk
  let chunkTotal = message.chunkTotal;
  let isReturn = true;
  let isChunk = (chunk != null && chunkTotal != null);
  if (isChunk) {
    if (chunk == chunkTotal) {
      isReturn = true;
    } else {
      isReturn = false;
    }
  }
  let data = message.data;
  if (!callbackIdAndDataMap.has(callbackId)) {
    callbackIdAndDataMap.set(callbackId, data);
  } else {
    if (isChunk) {
      if (typeof data === 'string') {
        let originalData = callbackIdAndDataMap.get(callbackId);
        callbackIdAndDataMap.set(callbackId, originalData.concat(data));
      } else {
        let promiseHook = getAndRemovePromiseHook(callbackId);
        if (promiseHook) {
          message.message = `unsupported chunk data type = ${typeof data}`;
          promiseHook.reject(message);
        } else {
          errorLog(
            `callbackId = ${callbackId} lost callback promiseHook`
          );
        }
        callbackIdAndDataMap.delete(callbackId);
        return;
      }
    }
  }
  if (isReturn) {
    try {
      if (isDevEnv()) {
        let costTime = message.invokeTimeList.slice(-1)[0].time - message.invokeTimeList.slice(0, 1)[0].time;
        if (costTime > INVOKE_WARN_TIME_COST) {
          //invoke > warnTimeCost to show warning
          warnLog(`[${message.invokeEnv}][${message.invokeSeq}]Invoke [${message.action}] cost time = %c${costTime.toFixed(2)}ms`, `color:white;background-color:hsl(360 ${costTime / 100} 50%);`, message.invokeTimeList, message);
        }
      }
      let promiseHook = getAndRemovePromiseHook(callbackId);
      if (promiseHook) {
        if (message.error) {
          message.message = message.error;
          promiseHook.reject(message);
        } else {
          message.data = callbackIdAndDataMap.get(callbackId);
          promiseHook.resolve(message);
        }
      } else {
        errorLog(
          `callbackId = ${callbackId} lost callback promiseHook`
        );
      }
    } finally {
      callbackIdAndDataMap.delete(callbackId);
    }

  }
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
