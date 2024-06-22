import {
  BACKGROUND,
  CONTENT_SCRIPT,
  OFFSCREEN,
  WEB_WORKER,
} from "../common/api/bridgeCommon";
import { debugLog } from "../common/log";

debugLog("background ready");

browser.browserAction.onClicked.addListener(() => {
  let creating = browser.tabs.create({
    url: "src/sidepanel/index.html",
  });
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
          ",callbackId=" +
          message.callbackId +
          ",error=" +
          message.error +
          "]"
      );
      message.from = OFFSCREEN;
      message.to = BACKGROUND;
      debugLog(
        "9.[offscreen-dummy][send][" +
          message.from +
          " -> " +
          message.to +
          "] message [action=" +
          message.action +
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
  }
};

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
          ",callbackId=" +
          message.callbackId +
          ",error=" +
          message.error +
          "]"
      );
      worker.postMessage(message);
    } else if (message.from == OFFSCREEN && message.to == BACKGROUND) {
      debugLog(
        "10.[background][receive][" +
          message.from +
          " -> " +
          message.to +
          "] message [action=" +
          message.action +
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
    } else if (message.from == BACKGROUND && message.to == OFFSCREEN) {
      debugLog(
        "4.[offscreen-dummy][receive][" +
          message.from +
          " -> " +
          message.to +
          "] message [action=" +
          message.action +
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
