import { onMessageHandle, onMessageHandleForWorker } from "@/common/extension/offscreen/util";
import { debugLog } from "../../common/log";
// @ts-expect-error: Query params not typed
import MyWorker from "./worker?worker&url";

debugLog("offscreen ready");

const worker = new Worker(new URL(MyWorker, import.meta.url), {
  type: "module",
});

worker.onmessage = function (event) {
  onMessageHandleForWorker(event);
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  onMessageHandle(message, worker);
});