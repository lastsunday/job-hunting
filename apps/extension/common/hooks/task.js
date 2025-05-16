import { DataSharePlanConfigDTO } from "../data/dto/dataSharePlanConfigDTO";
import {
  TASK_TYPE_COMPANY_DATA_DOWNLOAD,
  TASK_TYPE_COMPANY_DATA_UPLOAD,
  TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD,
  TASK_TYPE_COMPANY_TAG_DATA_UPLOAD,
  TASK_TYPE_JOB_DATA_DOWNLOAD,
  TASK_TYPE_JOB_DATA_UPLOAD,
  TASK_TYPE_JOB_TAG_DATA_DOWNLOAD,
  TASK_TYPE_JOB_TAG_DATA_UPLOAD
} from "../../common";
import { DEFAULT_DATA_REPO } from "@/common/config";

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
      result.push(TASK_TYPE_JOB_DATA_UPLOAD);
    }
    if (privateDataSyncEnableConfig.company) {
      result.push(TASK_TYPE_COMPANY_DATA_UPLOAD);
    }
    if (privateDataSyncEnableConfig.companyTag) {
      result.push(TASK_TYPE_COMPANY_TAG_DATA_UPLOAD);
    }
    if (privateDataSyncEnableConfig.jobTag) {
      result.push(TASK_TYPE_JOB_TAG_DATA_UPLOAD);
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
      result.push(TASK_TYPE_JOB_DATA_DOWNLOAD);
    }
    if (privateDataSyncEnableConfig.company) {
      result.push(TASK_TYPE_COMPANY_DATA_DOWNLOAD);
    }
    if (privateDataSyncEnableConfig.companyTag) {
      result.push(TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD);
    }
    if (privateDataSyncEnableConfig.jobTag) {
      result.push(TASK_TYPE_JOB_TAG_DATA_DOWNLOAD);
    }
    return result;
  };

  const getTaskTypeListFromDataSharePartnerConfig = (config) => {
    if (config == null || config == undefined || config.taskTypeList == null || config.taskTypeList == undefined) {
      return [
        TASK_TYPE_JOB_DATA_DOWNLOAD,
        TASK_TYPE_COMPANY_DATA_DOWNLOAD,
        TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD,
        TASK_TYPE_JOB_TAG_DATA_DOWNLOAD,
      ];
    } else {
      return config.taskTypeList;
    }
  }

  const getPrivateRepoName = () => {
    return DEFAULT_DATA_REPO;
  }

  return { getPrivateUploadTaskTypeFromConfig, getPrivateDownloadTaskTypeFromConfig, getPrivateRepoName, getTaskTypeListFromDataSharePartnerConfig };
}
