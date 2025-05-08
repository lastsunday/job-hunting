import { DataSharePlanConfigDTO } from "../data/dto/dataSharePlanConfigDTO";
import {
    TASK_TYPE_COMPANY_DATA_UPLOAD,
    TASK_TYPE_COMPANY_TAG_DATA_UPLOAD,
    TASK_TYPE_JOB_DATA_UPLOAD,
    TASK_TYPE_JOB_TAG_DATA_UPLOAD
} from "../../common";

export function useTask() {

    /**
     * 
     * @param {DataSharePlanConfigDTO} config 
     * @returns Array<string>
     */
    const getUploadTaskTypeFromConfig = (config) => {
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

    return { getUploadTaskTypeFromConfig };
}