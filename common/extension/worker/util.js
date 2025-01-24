import { isDevEnv } from "@/common";
import { handle } from "@/common/api/bridge";
import { OFFSCREEN, WEB_WORKER } from "@/common/api/bridgeCommon";
import useMessage from "@/common/extension/hooks/message";
import { debugLog } from "@/common/log";

/**
 *  [OffScreen] <- (message) [this@[WebWorker]]
 */
export function postSuccessMessage(message, data) {
  const { postSuccessMessage: _postSuccessMessage } = useMessage();
  _postSuccessMessage(message, data, {
    from: WEB_WORKER, to: OFFSCREEN, sendMessageFunction: (obj) => {
      postMessage(obj);
    }
  })
}

/**
 *  [OffScreen] <- (message) [this@[WebWorker]]
 */
export function postErrorMessage(message, error) {
  const { postErrorMessage: _postErrorMessage } = useMessage();
  _postErrorMessage(message, error, {
    from: WEB_WORKER, to: OFFSCREEN, sendMessageFunction: (obj) => {
      postMessage(obj);
    }
  });
}

const callbackIdAndParamMap = new Map();

export const onMessageHandle = (e, actionFunction) => {
  let message = e.data;
  if (message) {
    const invokeEnv = message.invokeEnv;
    if (invokeEnv == WEB_WORKER) {
      handle(message);
    } else {
      if (isDevEnv()) {
        const time = new Date().getTime();
        message.invokeTimeList.push({ env: WEB_WORKER, time, offset: time - message.invokeTimeList.slice(-1)[0].time });
      }
      if (message.from == OFFSCREEN && message.to == WEB_WORKER) {
        let callbackId = message.callbackId;
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
        let action = message.action;
        debugLog("[worker] invoke action = " + action);
        let chunk = message.chunk
        let chunkTotal = message.chunkTotal;
        let isSend = true;
        let isChunk = (chunk != null && chunkTotal != null);
        if (isChunk) {
          if (chunk == chunkTotal) {
            isSend = true;
          } else {
            isSend = false;
          }
        }
        let param = message.param;
        if (!callbackIdAndParamMap.has(callbackId)) {
          callbackIdAndParamMap.set(callbackId, param);
        } else {
          if (isChunk) {
            if (typeof param === 'string') {
              let originalParam = callbackIdAndParamMap.get(callbackId);
              callbackIdAndParamMap.set(callbackId, originalParam.concat(param));
            } else {
              postErrorMessage(message, `unsupported chunk param type = ${typeof param}`)
              callbackIdAndParamMap.delete(callbackId);
              return;
            }
          }
        }
        if (isSend) {
          try {
            actionFunction.get(action)(message, callbackIdAndParamMap.get(callbackId));
          } finally {
            callbackIdAndParamMap.delete(callbackId);
          }
        }
      }
    }
  }
}
