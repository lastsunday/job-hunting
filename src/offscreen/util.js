import { debugLog, errorLog } from "../common/log";
import { OFFSCREEN, WEB_WORKER } from "../common/api/bridgeCommon";

export function postSuccessMessage(message, data) {
  message.from = WEB_WORKER;
  message.to = OFFSCREEN;
  debugLog(
    "7.[worker][send][" +
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
  let resultMessage = JSON.parse(JSON.stringify(message));
  resultMessage.data = data;
  postMessage({
    data: resultMessage,
  });
}

export function postErrorMessage(message, error) {
  message.from = WEB_WORKER;
  message.to = OFFSCREEN;
  errorLog(
    "7.[worker][send][" +
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
  let resultMessage = JSON.parse(JSON.stringify(message));
  debugLog(resultMessage);
  resultMessage.error = error;
  postMessage({
    data: resultMessage,
  });
}
