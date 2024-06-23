import { debugLog } from "../common/log";
import { OFFSCREEN, WEB_WORKER } from "../common/api/bridgeCommon";
import { postSuccessMessage } from "./util";
import { NetworkService } from "./service/networkService";
import { JobService } from "./service/jobService";
import { CompanyService } from "./service/companyService";
import { Database } from "./database";

debugLog("worker ready");
const ACTION_FUNCTION = new Map();

export const WorkerBridge = {
  ping: function (message, param) {
    postSuccessMessage(message, "pong");
  },
};

mergeServiceMethod(ACTION_FUNCTION, WorkerBridge);
mergeServiceMethod(ACTION_FUNCTION, Database);
mergeServiceMethod(ACTION_FUNCTION, NetworkService);
mergeServiceMethod(ACTION_FUNCTION, JobService);
mergeServiceMethod(ACTION_FUNCTION, CompanyService);

function mergeServiceMethod(actionFunction, source) {
  let keys = Object.keys(source);
  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    actionFunction.set(key, source[key]);
  }
}

onmessage = function (e) {
  let message = e.data;
  if (message) {
    if (message.from == OFFSCREEN && message.to == WEB_WORKER) {
      debugLog(
        "6.[worker][receive][" +
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
      let action = message.action;
      debugLog("[worker] invoke action = " + action);
      ACTION_FUNCTION.get(action)(message, message.param);
    }
  }
};
