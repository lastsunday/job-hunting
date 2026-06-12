import { onMessageHandle, onMessageHandleForWorker } from "@/common/extension/offscreen/util";
import { infoLog } from "../../common/log";

infoLog("offscreen ready");
const workerUrl = chrome.runtime.getURL("/offscreen-worker.js");
const worker = new Worker(workerUrl, {
  type: "module",
});

worker.onmessage = function (event) {
  onMessageHandleForWorker(event);
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  onMessageHandle(message, worker);
});
