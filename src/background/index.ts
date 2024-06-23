import { infoLog, debugLog, errorLog } from "../common/log";
import {
  BACKGROUND,
  CONTENT_SCRIPT,
  OFFSCREEN,
} from "../common/api/bridgeCommon";
import { convertPureJobDetailUrl } from "../common/utils";
import { JobApi } from "../common/api";
import { getAndRemovePromiseHook } from "../common/api/bridge";

debugLog("background ready");
debugLog("keepAlive start");
//see https://stackoverflow.com/questions/66618136/persistent-service-worker-in-chrome-extension
const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20e3);
chrome.runtime.onStartup.addListener(keepAlive);
keepAlive();

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: "src/sidepanel/index.html",
  });
});

//TODO 没有定时清理，可能会有问题
const saveBrowseDetailTabIdMap = new Map();

//detect job detail access
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo?.status == "complete" && !isSavedByTabId(tab.id)) {
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
        recordSavedByTabId(tab.id);
      }
    }
  }
});

function isSavedByTabId(tabId) {
  return saveBrowseDetailTabIdMap.has(tabId);
}

function recordSavedByTabId(tabId) {
  saveBrowseDetailTabIdMap.set(tabId, null);
}

let creating: any;
async function setupOffscreenDocument(path: string) {
  // Check all windows controlled by the service worker to see if one
  // of them is the offscreen document with the given path
  if (await chrome.offscreen.hasDocument?.()) return;

  // create offscreen document
  if (creating) {
    await creating;
  } else {
    creating = chrome.offscreen.createDocument({
      url: chrome.runtime.getURL(path),
      reasons: [
        chrome.offscreen.Reason.WORKERS || chrome.offscreen.Reason.BLOBS,
      ],
      justification: "To run web worker to run sqlite",
    });
    await creating;
    creating = null;
  }

  chrome.runtime.onMessage.addListener(async function (
    message,
    sender,
    sendResponse
  ) {
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
        chrome.runtime.sendMessage(message);
      } else if (message.from == OFFSCREEN && message.to == BACKGROUND) {
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
        if (message.invokeEnv == CONTENT_SCRIPT) {
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
        }
      }
    }
  });
}

setupOffscreenDocument("src/offscreen/offscreen.html");
