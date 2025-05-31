import { DEFAULT_DATA_REPO, DEFAULT_PUBLIC_DATA_REPO } from "@/common/config";
import {
  TASK_TYPE_ALL_PRIVATE_DATA_DOWNLOAD,
  TASK_TYPE_ALL_PUBLIC_DATA_DOWNLOAD,
  TASK_TYPE_COMPANY_DATA_DOWNLOAD,
  TASK_TYPE_COMPANY_DATA_UPLOAD,
  TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD,
  TASK_TYPE_COMPANY_TAG_DATA_UPLOAD,
  TASK_TYPE_JOB_DATA_DOWNLOAD,
  TASK_TYPE_JOB_DATA_UPLOAD,
  TASK_TYPE_JOB_TAG_DATA_DOWNLOAD,
  TASK_TYPE_JOB_TAG_DATA_UPLOAD,
  TASK_TYPE_JOB_PUBLIC_DATA_UPLOAD,
  TASK_TYPE_JOB_PUBLIC_DATA_DOWNLOAD,
} from "../../common";
import { DataSharePlanConfigDTO } from "../data/dto/dataSharePlanConfigDTO";
const ALL_PRIVATE_DATA_TYPE = [
  { type: TASK_TYPE_JOB_DATA_DOWNLOAD },
  { type: TASK_TYPE_COMPANY_DATA_DOWNLOAD },
  { type: TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD },
  { type: TASK_TYPE_JOB_TAG_DATA_DOWNLOAD },
];
const ALL_PUBLIC_DATA_TYPE = [
  { type: TASK_TYPE_JOB_PUBLIC_DATA_DOWNLOAD },
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
    let result = new Set();
    if (config.taskTypeList) {
      if (config.taskTypeList.map(item => item.type).includes(TASK_TYPE_ALL_PRIVATE_DATA_DOWNLOAD)) {
        ALL_PRIVATE_DATA_TYPE.forEach(item => {
          result.add(item);
        })
      }
      if (config.taskTypeList.map(item => item.type).includes(TASK_TYPE_ALL_PUBLIC_DATA_DOWNLOAD)) {
        ALL_PUBLIC_DATA_TYPE.forEach(item => {
          result.add(item);
        })
      }
      config.taskTypeList.filter(item => item.type !== TASK_TYPE_ALL_PRIVATE_DATA_DOWNLOAD && item.type !== TASK_TYPE_ALL_PUBLIC_DATA_DOWNLOAD).forEach(item => {
        result.add(item);
      });
    }
    return Array.from(result);
  }

  const getPrivateRepoName = () => {
    return DEFAULT_DATA_REPO;
  }

  /**
   * 
   * @param {DataSharePlanConfigDTO} config 
   * @returns Array<string>
   */
  const getPublicUploadTaskTypeFromConfig = (config) => {
    if (config == null || config == undefined || !config.publicDataSyncEnableConfig) {
      throw "invalid config";
    }
    const result = [];
    const publicDataSyncEnableConfig = config.publicDataSyncEnableConfig;
    if (publicDataSyncEnableConfig.jobPublic) {
      result.push({ type: TASK_TYPE_JOB_PUBLIC_DATA_UPLOAD });
    }
    return result;
  };

  /**
   * 
   * @param {DataSharePlanConfigDTO} config 
   * @returns Array<string>
   */
  const getPublicDownloadTaskTypeFromConfig = (config) => {
    if (config == null || config == undefined || !config.publicDataSyncEnableConfig) {
      throw "invalid config";
    }
    const result = [];
    const publicDataSyncEnableConfig = config.publicDataSyncEnableConfig;
    if (publicDataSyncEnableConfig.jobPublic) {
      result.push({ type: TASK_TYPE_JOB_PUBLIC_DATA_DOWNLOAD });
    }
    return result;
  };

  const getPublicRepoName = () => {
    return DEFAULT_PUBLIC_DATA_REPO;
  }

  return {
    getPrivateUploadTaskTypeFromConfig, getPrivateDownloadTaskTypeFromConfig,
    getPrivateRepoName, getTaskTypeListFromDataSharePartnerConfig,
    getPublicUploadTaskTypeFromConfig, getPublicDownloadTaskTypeFromConfig,
    getPublicRepoName,
  };
}
