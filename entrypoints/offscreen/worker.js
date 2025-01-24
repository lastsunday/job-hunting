// Work around for: https://github.com/wxt-dev/wxt/issues/942
// @ts-ignore
globalThis._content = undefined;
import userService from "@/common/extension/hooks/service.js";
import { onMessageHandle, postSuccessMessage } from "@/common/extension/worker/util";
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

const { mergeServiceMethod } = userService();

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

onmessage = function (e) {
  onMessageHandle(e, ACTION_FUNCTION);
};