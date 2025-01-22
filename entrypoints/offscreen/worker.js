// Work around for: https://github.com/wxt-dev/wxt/issues/942
// @ts-ignore
globalThis._content = undefined;

import { isDevEnv } from "../../common";
import { OFFSCREEN, WEB_WORKER } from "../../common/api/bridgeCommon";
import { debugLog } from "../../common/log";
import { Database } from "./database";
import { AppService } from "./service/appService";
import { AssistantService } from "./service/assistantService";
import { CompanyService } from "./service/companyService";
import { CompanyTagService } from "./service/companyTagService";
import { ConfigService } from "./service/configService";
import { DataSharePartnerService } from "./service/dataSharePartnerService";
import { DeveloperService } from "./service/developerService";
import { FileService } from "./service/fileService";
import { JobService } from "./service/jobService";
import { JobTagService } from "./service/jobTagService";
import { MissionLogService } from "./service/missionLogService";
import { MissionService } from "./service/missionService";
import { NetworkService } from "./service/networkService";
import { TagService } from "./service/tagService";
import { TaskDataDownloadService } from "./service/taskDataDownloadService";
import { TaskDataMergeService } from "./service/taskDataMergeService";
import { TaskDataUploadService } from "./service/taskDataUploadService";
import { TaskService } from "./service/taskService";
import { postErrorMessage, postSuccessMessage } from "./util";

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
};
