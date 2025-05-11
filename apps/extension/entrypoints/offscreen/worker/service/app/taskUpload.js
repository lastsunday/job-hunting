import {
    DATA_TYPE_NAME_COMPANY,
    DATA_TYPE_NAME_COMPANY_TAG,
    DATA_TYPE_NAME_JOB,
    DATA_TYPE_NAME_JOB_TAG,
    TASK_TYPE_COMPANY_DATA_UPLOAD,
    TASK_TYPE_COMPANY_TAG_DATA_UPLOAD,
    TASK_TYPE_JOB_DATA_UPLOAD,
    TASK_TYPE_JOB_TAG_DATA_UPLOAD
} from "@/common";
import { EXCEPTION } from "@/common/api/github";
import {
    companyDataToExcelJSONArray,
    companyTagDataToExcelJSONArray,
    jobDataToExcelJSONArray,
    jobTagDataToExcelJSONArray
} from "@/common/excel";
import { debugLog, errorLog, infoLog } from "@/common/log";
import dayjs from "dayjs";
import minMax from 'dayjs/plugin/minMax'; // ES 2015
import { _taskDataUploadGetById, _taskDataUploadGetMaxEndDatetime } from "../taskDataUploadService";
import { getPathByDatetime, isLogin } from "./index";
import {
    calculateRepoMaxUploadDate, createRepoIfNotExists, getCompanyData,
    getCompanyTagData, getJobData, getJobTagData, saveTask, uploadData
} from "./taskUploadLogic";
dayjs.extend(minMax);

// Calculate
export async function calculateUploadTask({ userName, repoName, taskType,
    targetDay = async () => { return dayjs() },
} = {}) {
    //根据今天的时间判断最新的job,company,companyTag任务是否已经存在
    const taskDataUploadMaxDateString = await _taskDataUploadGetMaxEndDatetime({ username: userName, reponame: repoName, type: taskType });
    const taskDataUploadMaxDate = taskDataUploadMaxDateString ? dayjs(taskDataUploadMaxDateString).startOf("day") : null;
    const today = (await targetDay()).startOf("day");
    if (today.isSame(taskDataUploadMaxDate)) {
        //如果存在
        infoLog(`[TASK DATA UPLOAD CALCULATE] taskDataUploadMaxDate is today = ${taskDataUploadMaxDate}`)
        infoLog(`[TASK DATA UPLOAD CALCULATE] skip add data upload record`)
        return false;
    } else {
        infoLog(`[TASK DATA UPLOAD CALCULATE] taskDataUploadMaxDate(${taskDataUploadMaxDate}) not equal today(${today})`)
        infoLog(`[TASK DATA UPLOAD CALCULATE] add data upload record starting`)
        //如果不存在
        //获取仓库中最新数据上传的时间
        try {
            const repoMaxDate = await calculateRepoMaxUploadDate({
                userName, repoName, type: taskType
            })
            let dataSyncStartDatetime = null;
            //计算数据项开始时间,取最小值(数据库时间,仓库时间)
            if(repoMaxDate && taskDataUploadMaxDate){
                dataSyncStartDatetime = dayjs.min(taskDataUploadMaxDate, dayjs(repoMaxDate));
            }else {
                if(repoMaxDate == null){
                    dataSyncStartDatetime = repoMaxDate;
                }else{
                    dataSyncStartDatetime = taskDataUploadMaxDate;
                }
            }
            infoLog(`[TASK DATA UPLOAD CALCULATE] dataSyncStartDatetime = ${dataSyncStartDatetime}`)
            try {
                infoLog(`[TASK DATA UPLOAD CALCULATE] add data upload task ${userName}/${repoName} startDatetime=${dataSyncStartDatetime} endDatetime=${today} starting`)
                infoLog(`[TASK DATA UPLOAD CALCULATE] add data upload task ${userName}/${repoName} type=${taskType}`)
                await saveTask({ type: taskType, startDatetime: dataSyncStartDatetime, endDatetime: today, userName, repoName })
                debugLog(`[TASK DATA UPLOAD CALCULATE] add data upload record end`)
                return true;
            } catch (e) {
                errorLog(e);
            }
        } catch (e) {
            errorLog(e);
        }
        return false;
    }
}

// Handle
export function setup(handleMap) {
    handleMap.set(TASK_TYPE_JOB_DATA_UPLOAD, async (dataId) => {
        return uploadDataByDataId(dataId, DATA_TYPE_NAME_JOB, getJobData, jobDataToExcelJSONArray);
    })
    handleMap.set(TASK_TYPE_COMPANY_DATA_UPLOAD, async (dataId) => {
        return uploadDataByDataId(dataId, DATA_TYPE_NAME_COMPANY, getCompanyData, companyDataToExcelJSONArray);
    })
    handleMap.set(TASK_TYPE_COMPANY_TAG_DATA_UPLOAD, async (dataId) => {
        return uploadDataByDataId(dataId, DATA_TYPE_NAME_COMPANY_TAG, getCompanyTagData, companyTagDataToExcelJSONArray);
    })
    handleMap.set(TASK_TYPE_JOB_TAG_DATA_UPLOAD, async (dataId) => {
        return uploadDataByDataId(dataId, DATA_TYPE_NAME_JOB_TAG, getJobTagData, jobTagDataToExcelJSONArray);
    })
}

export async function uploadDataByDataId(dataId, dataTypeName, getDataFunction, jsonObjectToExcelJsonArrayFunction) {
    if (!(await isLogin())) {
        debugLog(`[TASK HANDLE]No login info, skip run task dataId = ${dataId}, dataTypeName = ${dataTypeName}`)
        throw EXCEPTION.NO_LOGIN;
    }
    const taskDataUpload = await _taskDataUploadGetById({ param: dataId });
    const userName = taskDataUpload.username;
    const repoName = taskDataUpload.reponame;
    const startDatetime = taskDataUpload.startDatetime;
    const endDatetime = taskDataUpload.endDatetime;
    const dirPath = getPathByDatetime({ endDatetime });
    await createRepoIfNotExists({ userName, repoName });
    return await uploadData({
        userName, repoName, dirPath,
        dataTypeName,
        dataList: (await getDataFunction({ startDatetime, endDatetime })).items,
        jsonObjectToExcelJsonArrayFunction,
    });
}
