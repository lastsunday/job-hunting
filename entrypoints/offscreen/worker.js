// Work around for: https://github.com/wxt-dev/wxt/issues/942
// @ts-ignore
globalThis._content = undefined;
import { isDevEnv } from "@/common";
import { handle } from "@/common/api/bridge";
import { OFFSCREEN, WEB_WORKER } from "@/common/api/bridgeCommon";
import { postErrorMessage, postSuccessMessage } from "@/common/extension/worker/util";
import { debugLog } from "@/common/log";
import { Database } from "./worker/database";
import { AppService } from "./worker/service/appService";
import { AssistantService } from "./worker/service/assistantService";
import { CompanyService } from "./worker/service/companyService";
import { CompanyTagService } from "./worker/service/companyTagService";
import { ConfigService } from "./worker/service/configService";
import { DataSharePartnerService } from "./worker/service/dataSharePartnerService";
import { DeveloperService } from "./worker/service/developerService";
import { FileService } from "./worker/service/fileService";
import { JobService } from "./worker/service/jobService";
import { JobTagService } from "./worker/service/jobTagService";
import { MissionLogService } from "./worker/service/missionLogService";
import { MissionService } from "./worker/service/missionService";
import { NetworkService } from "./worker/service/networkService";
import { TagService } from "./worker/service/tagService";
import { TaskDataDownloadService } from "./worker/service/taskDataDownloadService";
import { TaskDataMergeService } from "./worker/service/taskDataMergeService";
import { TaskDataUploadService } from "./worker/service/taskDataUploadService";
import { TaskService } from "./worker/service/taskService";

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
mergeServiceMethod(ACTION_FUNCTION, AppService);
mergeServiceMethod(ACTION_FUNCTION, JobService);
mergeServiceMethod(ACTION_FUNCTION, CompanyService);
mergeServiceMethod(ACTION_FUNCTION, TagService);
mergeServiceMethod(ACTION_FUNCTION, CompanyTagService);
mergeServiceMethod(ACTION_FUNCTION, ConfigService);
mergeServiceMethod(ACTION_FUNCTION, AssistantService);
mergeServiceMethod(ACTION_FUNCTION, DeveloperService);
mergeServiceMethod(ACTION_FUNCTION, MissionService);
mergeServiceMethod(ACTION_FUNCTION, MissionLogService);
mergeServiceMethod(ACTION_FUNCTION, TaskService);
mergeServiceMethod(ACTION_FUNCTION, TaskDataUploadService);
mergeServiceMethod(ACTION_FUNCTION, TaskDataDownloadService);
mergeServiceMethod(ACTION_FUNCTION, FileService);
mergeServiceMethod(ACTION_FUNCTION, TaskDataMergeService);
mergeServiceMethod(ACTION_FUNCTION, DataSharePartnerService);
mergeServiceMethod(ACTION_FUNCTION, JobTagService);


function mergeServiceMethod(actionFunction, source) {
  let keys = Object.keys(source);
  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    actionFunction.set(key, source[key]);
  }
}

const callbackIdAndParamMap = new Map();

onmessage = function (e) {
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
          "6.[worker][receive][" +
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
            ACTION_FUNCTION.get(action)(message, callbackIdAndParamMap.get(callbackId));
          } finally {
            callbackIdAndParamMap.delete(callbackId);
          }
        }
      }
    }
  }
};