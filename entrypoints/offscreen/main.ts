import { isDevEnv } from "../../common";
import { BACKGROUND, OFFSCREEN, WEB_WORKER } from "../../common/api/bridgeCommon";
import { debugLog } from "../../common/log";
// @ts-expect-error: Query params not typed
import MyWorker from "./worker?worker&url";

debugLog("offscreen ready");

const worker = new Worker(new URL(MyWorker, import.meta.url), {
  type: "module",
});

worker.onmessage = function (event) {
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
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
});
