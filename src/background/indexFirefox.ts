import {
  BACKGROUND,
  CONTENT_SCRIPT,
  OFFSCREEN,
  WEB_WORKER,
} from "../common/api/bridgeCommon";
import { infoLog, debugLog, errorLog } from "../common/log";
import { convertPureJobDetailUrl } from "../common/utils";
import { JobApi } from "../common/api";
import { getAndRemovePromiseHook, EVENT_BRIDGE } from "../common/api/bridge";

debugLog("background ready");

browser.browserAction.onClicked.addListener(() => {
  let creating = browser.tabs.create({
    url: "src/sidepanel/index.html",
  });
});

//detect job detail access
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo?.status == "complete") {
    if (tab.url) {
      let pureUrl = convertPureJobDetailUrl(tab.url);
      let job = await JobApi.getJobByDetailUrl(pureUrl, {
        invokeEnv: BACKGROUND,
      });
      if (job) {
        infoLog(`save jobBrowseDetailHistory start jobId = ${job.jobId}`);
        await JobApi.addJobBrowseDetailHistory(job.jobId, {
          invokeEnv: BACKGROUND,
        });
        infoLog(`save jobBrowseDetailHistory success jobId = ${job.jobId}`);
      }
    }
  }
});

const worker = new Worker(new URL("../offscreen/worker.js", import.meta.url), {
  type: "module",
});

worker.onmessage = function (event) {
  let message = event.data.data;
  if (message) {
    if (message.from == WEB_WORKER && message.to == OFFSCREEN) {
      debugLog(
        "8.[offscreen-dummy][receive][" +
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
      if (message.invokeEnv == CONTENT_SCRIPT) {
        debugLog(
          "9.[offscreen-dummy][send][" +
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
        debugLog(
          "10.[background][receive][" +
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
        message.from = BACKGROUND;
        message.to = CONTENT_SCRIPT;
        debugLog(
          "11.[background][send][" +
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
      } else if (message.invokeEnv == BACKGROUND) {
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
      } else {
        throw `not support invokeEnv = ${message.invokeEnv}`;
      }
    }
  }
};

window.addEventListener(EVENT_BRIDGE, (event) => {
  let message = event.detail;
  debugLog(
    "4.[offscreen-dummy][receive][" +
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
    "5.[offscreen-dummy][send][" +
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
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message) {
    if (message.from == CONTENT_SCRIPT && message.to == BACKGROUND) {
      //get the tab id from content script page,not the extension page(eg: sidepanel)
      if (sender.tab) {
        message.tabId = sender.tab.id;
      }
      debugLog(
        "2.[background][receive][" +
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
      message.from = BACKGROUND;
      message.to = OFFSCREEN;
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
      debugLog(
        "4.[offscreen-dummy][receive][" +
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
        "5.[offscreen-dummy][send][" +
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
