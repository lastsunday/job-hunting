import { isDevEnv } from "@/common";
import { BACKGROUND, OFFSCREEN, WEB_WORKER } from "@/common/api/bridgeCommon";
import useMessage from "@/common/extension/hooks/message";
import { debugLog } from "@/common/log";

/**
 * [this@[OffScreen]] (message)-> [WebWorker]
 */
export function postSuccessMessage(message, data) {
  const { postSuccessMessage: _postSuccessMessage } = useMessage();
  const worker = message.worker;
  delete message.worker;
  _postSuccessMessage(message, data, {
    from: OFFSCREEN, to: WEB_WORKER, sendMessageFunction: (obj) => {
      worker.postMessage(obj);
    }
  })
}

/**
 * [this@[OffScreen]] (message)-> [WebWorker]
 */
export function postErrorMessage(message, error) {
  const { postErrorMessage: _postErrorMessage } = useMessage();
  const worker = message.worker;
  delete message.worker;
  _postErrorMessage(message, error, {
    from: OFFSCREEN, to: WEB_WORKER, sendMessageFunction: (obj) => {
      worker.postMessage(obj);
    }
  });
}

export const onMessageHandleForWorker = (event) => {
  let message = event.data.data;
  if (message) {
    if (isDevEnv()) {
      const time = new Date().getTime();
      message.invokeTimeList.push({ env: OFFSCREEN, time, offset: time - message.invokeTimeList.slice(-1)[0].time });
    }
    if (message.from == WEB_WORKER && message.to == OFFSCREEN) {
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
      message.from = OFFSCREEN;
      message.to = BACKGROUND;
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
  }
}

export const onMessageHandle = (message, worker) => {
  if (message) {
    if (isDevEnv()) {
      const time = new Date().getTime();
      message.invokeTimeList.push({ env: OFFSCREEN, time, offset: time - message.invokeTimeList.slice(-1)[0].time });
    }
    if (message.from == BACKGROUND && message.to == OFFSCREEN) {
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
      message.from = OFFSCREEN;
      message.to = WEB_WORKER;
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
      worker.postMessage(message);
    }
  }
}