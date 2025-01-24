import {
    DATA_TYPE_NAME_COMPANY,
    DATA_TYPE_NAME_COMPANY_TAG,
    DATA_TYPE_NAME_JOB,
    DATA_TYPE_NAME_JOB_TAG,
    TASK_TYPE_COMPANY_DATA_MERGE,
    TASK_TYPE_COMPANY_TAG_DATA_MERGE,
    TASK_TYPE_JOB_DATA_MERGE,
    TASK_TYPE_JOB_TAG_DATA_MERGE
} from "@/common";
import { CompanyTagExportBO } from "@/common/data/bo/companyTagExportBO";
import { JobTagExportBO } from "@/common/data/bo/jobTagExportBO";
import {
    COMPANY_FILE_HEADER,
    COMPANY_TAG_FILE_HEADER,
    companyExcelDataToObjectArray,
    companyTagExcelDataToObjectArray,
    JOB_FILE_HEADER,
    JOB_TAG_FILE_HEADER,
    jobExcelDataToObjectArray,
    jobTagExcelDataToObjectArray,
    validImportData
} from "@/common/excel";
import { debugLog } from "@/common/log";
import { getMergeDataListForCompany, getMergeDataListForJob, getMergeDataListForTag } from "@/common/service/dataSyncService";
import { genIdFromText } from "@/common/utils";
import { getExcelDataFromZipFile } from "@/common/zip";
import dayjs from "dayjs";
import minMax from 'dayjs/plugin/minMax'; // ES 2015
import { read, utils } from "xlsx";
import { getDb } from "../../database";
import { _batchAddOrUpdateCompany, _companyGetByIds } from "../companyService";
import { _batchAddOrUpdateCompanyTag, _companyTagExport } from "../companyTagService";
import { _fileGetById } from "../fileService";
import { _batchAddOrUpdateJob, _jobGetByIds } from "../jobService";
import { _jobTagBatchAddOrUpdate, _jobTagExport } from "../jobTagService";
import { _taskDataMergeAddOrUpdate, _taskDataMergeGetById } from "../taskDataMergeService";
import { _getUser } from "./index";
dayjs.extend(minMax);

// Handle
export function setup(handleMap) {
    handleMap.set(TASK_TYPE_JOB_DATA_MERGE, async (dataId) => {
        return mergeDataByDataId(dataId, TASK_TYPE_JOB_DATA_MERGE, DATA_TYPE_NAME_JOB, JOB_FILE_HEADER, jobExcelDataToObjectArray, async (items, taskDataMerge, connection) => {
            //处理数据冲突问题，根据创建时间来判断
            //处理公司名全称问题
            let targetList = await getMergeDataListForJob(items, "jobId", async (ids) => {
                return await _jobGetByIds({ param: ids, connection });
            });
            await _batchAddOrUpdateJob({ param: targetList, connection });
            return targetList.length;
        });
    })
    handleMap.set(TASK_TYPE_COMPANY_DATA_MERGE, async (dataId) => {
        return mergeDataByDataId(dataId, TASK_TYPE_COMPANY_DATA_MERGE, DATA_TYPE_NAME_COMPANY, COMPANY_FILE_HEADER, companyExcelDataToObjectArray, async (items, taskDataMerge, connection) => {
            //处理数据冲突问题，根据数据来源更新时间来判断
            let targetList = await getMergeDataListForCompany(items, "companyId", async (ids) => {
                return _companyGetByIds({ param: ids, connection });
            });
            await _batchAddOrUpdateCompany({ param: targetList, connection });
            return targetList.length;
        });
    })
    handleMap.set(TASK_TYPE_COMPANY_TAG_DATA_MERGE, async (dataId) => {
        return mergeDataByDataId(dataId, TASK_TYPE_COMPANY_TAG_DATA_MERGE, DATA_TYPE_NAME_COMPANY_TAG, COMPANY_TAG_FILE_HEADER, companyTagExcelDataToObjectArray, async (items, taskDataMerge, connection) => {
            let userDTO = await _getUser({ connection });
            if (userDTO) {
                let username = userDTO.login;
                //处理数据冲突问题，根据更新时间合并
                let targetList = await getMergeDataListForTag(items, "companyName", async (companyNames) => {
                    let searchParam = new CompanyTagExportBO();
                    //如果数据是当前登录用户，则将source设置为空，作为本地用户
                    searchParam.source = taskDataMerge.username == username ? "" : taskDataMerge.username;
                    searchParam.companyIds = companyNames.map(item => genIdFromText(item));
                    return await _companyTagExport({ param: searchParam, connection });
                })
                if (targetList.length > 0) {
                    //如果补充source信息
                    targetList.forEach(item => {
                        item.source = taskDataMerge.username == username ? null : taskDataMerge.username;
                    });
                }
                await _batchAddOrUpdateCompanyTag({ companyTagBOs: targetList, overrideUpdateDatetime: true, connection });
                return targetList.length;
            } else {
                throw `[Task Data Merge] login user not found`;
            }
        });
    })
    handleMap.set(TASK_TYPE_JOB_TAG_DATA_MERGE, async (dataId) => {
        return mergeDataByDataId(dataId, TASK_TYPE_JOB_TAG_DATA_MERGE, DATA_TYPE_NAME_JOB_TAG, JOB_TAG_FILE_HEADER, jobTagExcelDataToObjectArray, async (items, taskDataMerge, connection) => {
            let userDTO = await _getUser({ connection });
            if (userDTO) {
                let username = userDTO.login;
                //处理数据冲突问题，根据更新时间合并
                let targetList = await getMergeDataListForTag(items, "jobId", async (ids) => {
                    let searchParam = new JobTagExportBO();
                    //如果数据是当前登录用户，则将source设置为空，作为本地用户
                    searchParam.source = taskDataMerge.username == username ? "" : taskDataMerge.username;
                    searchParam.jobIds = ids;
                    return await _jobTagExport({ param: searchParam, connection });
                })
                if (targetList.length > 0) {
                    //如果补充source信息
                    targetList.forEach(item => {
                        item.source = taskDataMerge.username == username ? null : taskDataMerge.username;
                    });
                }
                await _jobTagBatchAddOrUpdate(targetList, true, { connection });
                return targetList.length;
            } else {
                throw `[Task Data Merge] login user not found`;
            }
        });
    })
}

async function mergeDataByDataId(dataId, taskType, dataTypeName, fileHeader, excelDataToObjectArrayFunction, dataInsertFunction) {
    debugLog(`[TASK DATA MERGE] Task dataId = ${dataId},taskType = ${taskType}`);
    const taskDataMerge = await _taskDataMergeGetById({ param: dataId });
    debugLog(`[TASK DATA MERGE] taskDataMerge dataId = ${taskDataMerge.dataId},username = ${taskDataMerge.username},repoName = ${taskDataMerge.reponame},datetime = ${taskDataMerge.datetime}`);
    const file = await _fileGetById({ param: taskDataMerge.dataId });
    debugLog(`[TASK DATA MERGE] file id = ${file.id},name = ${file.name}`);
    let base64Content = file.content;
    let excelFileBufferData = await getExcelDataFromZipFile(base64Content, dataTypeName);
    let wb = read(excelFileBufferData, { type: "buffer" });
    let validResultObject = validImportData(utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }), fileHeader);
    if (!validResultObject.validResult) {
        debugLog(`[TASK DATA MERGE] valid file name = ${file.name}, id = ${file.id} failure`);
        return `文件校验失败，缺少数据列(${validResultObject.lackColumn.length}):${validResultObject.lackColumn.join(",")}`;
    }
    debugLog(`[TASK DATA MERGE] valid file name = ${file.name}, id = ${file.id} success`);
    const data = utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 2 });
    await (await getDb()).transaction(async (tx) => {
        let count = await dataInsertFunction(excelDataToObjectArrayFunction(data, taskDataMerge.datetime), taskDataMerge, tx);
        taskDataMerge.dataCount = count;
        await _taskDataMergeAddOrUpdate({ param: taskDataMerge, connection: tx });
        debugLog(`[TASK DATA MERGE] merge file name = ${file.name}, id = ${file.id} success,data count = ${count}`);
    });
}