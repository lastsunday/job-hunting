// Work around for: https://github.com/wxt-dev/wxt/issues/942
// @ts-ignore
globalThis._content = undefined;
import useService from "@/common/extension/hooks/service.js";
import { onMessageHandle, postSuccessMessage } from "@/common/extension/worker/util";
import { infoLog } from "@/common/log";
import { Database } from "./offscreen/worker/database";
import { AppService } from "./offscreen/worker/service/appService";
import { AssistantService } from "./offscreen/worker/service/assistantService";
import { CompanyService } from "./offscreen/worker/service/companyService";
import { CompanyTagService } from "./offscreen/worker/service/companyTagService";
import { ConfigService } from "./offscreen/worker/service/configService";
import { DataSharePartnerService } from "./offscreen/worker/service/dataSharePartnerService";
import { DeveloperService } from "./offscreen/worker/service/developerService";
import { FileService } from "./offscreen/worker/service/fileService";
import { JobService } from "./offscreen/worker/service/jobService";
import { JobTagService } from "./offscreen/worker/service/jobTagService";
import { MissionLogService } from "./offscreen/worker/service/missionLogService";
import { MissionService } from "./offscreen/worker/service/missionService";
import { NetworkService } from "./offscreen/worker/service/networkService";
import { TagService } from "./offscreen/worker/service/tagService";
import { TaskDataDownloadService } from "./offscreen/worker/service/taskDataDownloadService";
import { TaskDataMergeService } from "./offscreen/worker/service/taskDataMergeService";
import { TaskDataUploadService } from "./offscreen/worker/service/taskDataUploadService";
import { TaskService } from "./offscreen/worker/service/taskService";
import { JobSnapshotService } from "./offscreen/worker/service/jobSnapshotService";
import JobPublicService from "./offscreen/worker/service/jobPublicService";
import CompanyCommentService from "./offscreen/worker/service/companyCommentService";
import DataSourceMetadataService from "./offscreen/worker/service/dataSourceMetadataService";
import { LlmService } from "./offscreen/worker/service/llmService";

export default defineUnlistedScript(() => {
  // Work around for: https://github.com/wxt-dev/wxt/issues/942
  // @ts-ignore
  globalThis._content = undefined;

  infoLog("worker ready");
  const ACTION_FUNCTION = new Map();

  const WorkerBridge = {
    ping: function (message, param) {
      postSuccessMessage(message, "pong");
    },
  };

  const { mergeServiceMethod } = useService();

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
  mergeServiceMethod(ACTION_FUNCTION, JobSnapshotService);
  mergeServiceMethod(ACTION_FUNCTION, JobPublicService);
  mergeServiceMethod(ACTION_FUNCTION, CompanyCommentService);
  mergeServiceMethod(ACTION_FUNCTION, DataSourceMetadataService);
  mergeServiceMethod(ACTION_FUNCTION, LlmService);

  onmessage = function (e) {
    onMessageHandle(e, ACTION_FUNCTION);
  };

});
