import { DEFAULT_DATA_REPO } from "@/common/config";
import {
  TASK_TYPE_ALL_PRIVATE_DATA_DOWNLOAD,
  TASK_TYPE_COMPANY_DATA_DOWNLOAD,
  TASK_TYPE_COMPANY_DATA_UPLOAD,
  TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD,
  TASK_TYPE_COMPANY_TAG_DATA_UPLOAD,
  TASK_TYPE_JOB_DATA_DOWNLOAD,
  TASK_TYPE_JOB_DATA_UPLOAD,
  TASK_TYPE_JOB_TAG_DATA_DOWNLOAD,
  TASK_TYPE_JOB_TAG_DATA_UPLOAD,
} from "../../common";
import { DataSharePlanConfigDTO } from "../data/dto/dataSharePlanConfigDTO";
const ALL_PRIVATE_DATA_TYPE = [
  { type: TASK_TYPE_JOB_DATA_DOWNLOAD },
  { type: TASK_TYPE_COMPANY_DATA_DOWNLOAD },
  { type: TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD },
  { type: TASK_TYPE_JOB_TAG_DATA_DOWNLOAD },
];
export function useTask() {

  /**
   * 
   * @param {DataSharePlanConfigDTO} config 
   * @returns Array<string>
   */
  const getPrivateUploadTaskTypeFromConfig = (config) => {
    if (config == null || config == undefined || !config.privateDataSyncEnableConfig) {
      throw "invalid config";
    }
    const result = [];
    const privateDataSyncEnableConfig = config.privateDataSyncEnableConfig;
    if (privateDataSyncEnableConfig.job) {
      result.push({ type: TASK_TYPE_JOB_DATA_UPLOAD });
    }
    if (privateDataSyncEnableConfig.company) {
      result.push({ type: TASK_TYPE_COMPANY_DATA_UPLOAD });
    }
    if (privateDataSyncEnableConfig.companyTag) {
      result.push({ type: TASK_TYPE_COMPANY_TAG_DATA_UPLOAD });
    }
    if (privateDataSyncEnableConfig.jobTag) {
      result.push({ type: TASK_TYPE_JOB_TAG_DATA_UPLOAD });
    }
    return result;
  };

  /**
   * 
   * @param {DataSharePlanConfigDTO} config 
   * @returns Array<string>
   */
  const getPrivateDownloadTaskTypeFromConfig = (config) => {
    if (config == null || config == undefined || !config.privateDataSyncEnableConfig) {
      throw "invalid config";
    }
    const result = [];
    const privateDataSyncEnableConfig = config.privateDataSyncEnableConfig;
    if (privateDataSyncEnableConfig.job) {
      result.push({ type: TASK_TYPE_JOB_DATA_DOWNLOAD });
    }
    if (privateDataSyncEnableConfig.company) {
      result.push({ type: TASK_TYPE_COMPANY_DATA_DOWNLOAD });
    }
    if (privateDataSyncEnableConfig.companyTag) {
      result.push({ type: TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD });
    }
    if (privateDataSyncEnableConfig.jobTag) {
      result.push({ type: TASK_TYPE_JOB_TAG_DATA_DOWNLOAD });
    }
    return result;
  };

  const getTaskTypeListFromDataSharePartnerConfig = (config) => {
    let result = [];
    if (config == null || config == undefined || config.taskTypeList == null || config.taskTypeList == undefined) {
      result.push(...ALL_PRIVATE_DATA_TYPE);
    } else {
      if (config.taskTypeList.map(item => item.type).includes(TASK_TYPE_ALL_PRIVATE_DATA_DOWNLOAD)) {
        result.push(...ALL_PRIVATE_DATA_TYPE);
      } else {
        result.push(...config.taskTypeList);
      }
    }
    return result;
  }

  const getPrivateRepoName = () => {
    return DEFAULT_DATA_REPO;
  }

  return {
    getPrivateUploadTaskTypeFromConfig, getPrivateDownloadTaskTypeFromConfig,
    getPrivateRepoName, getTaskTypeListFromDataSharePartnerConfig,
  };
}
