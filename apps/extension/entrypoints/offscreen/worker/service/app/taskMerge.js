import {
  DATA_TYPE_NAME_COMPANY,
  DATA_TYPE_NAME_COMPANY_TAG,
  DATA_TYPE_NAME_JOB,
  DATA_TYPE_NAME_JOB_PUBLIC,
  DATA_TYPE_NAME_JOB_TAG,
  TASK_TYPE_COMPANY_COMMENT_DATA_MERGE,
  TASK_TYPE_COMPANY_DATA_MERGE,
  TASK_TYPE_COMPANY_TAG_DATA_MERGE,
  TASK_TYPE_JOB_DATA_MERGE,
  TASK_TYPE_JOB_PUBLIC_DATA_MERGE,
  TASK_TYPE_JOB_TAG_DATA_MERGE,
  TASK_TYPE_METADATA_DATA_MERGE
} from "@/common";
import { CompanyCommentApi } from "@/common/api";
import { CompanyTagExportBO } from "@/common/data/bo/companyTagExportBO";
import { JobTagExportBO } from "@/common/data/bo/jobTagExportBO";
import {
  COMPANY_COMMENT_FILE_HEADER,
  COMPANY_FILE_HEADER,
  COMPANY_TAG_FILE_HEADER,
  companyCommentExcelDataToObjectArray,
  companyExcelDataToObjectArray,
  companyTagExcelDataToObjectArray,
  JOB_FILE_HEADER,
  JOB_PUBLIC_FILE_HEADER,
  JOB_TAG_FILE_HEADER,
  jobExcelDataToObjectArray,
  jobPublicExcelDataToObjectArray,
  jobTagExcelDataToObjectArray,
  validImportData
} from "@/common/excel";
import { useCompanyComment } from "@/common/hooks/companyComment";
import { debugLog, infoLog } from "@/common/log";
import { getMergeDataListForCompany, getMergeDataListForCompanyComment, getMergeDataListForJob, getMergeDataListForJobPublic, getMergeDataListForTag } from "@/common/service/dataSyncService";
import { genIdFromText } from "@/common/utils";
import { base64decode } from "@/common/utils/base64";
import { getExcelDataFromZipFile } from "@/common/zip";
import dayjs from "dayjs";
import minMax from 'dayjs/plugin/minMax'; // ES 2015
import { read, utils } from "xlsx";
import { getDb } from "../../database";
import { _batchAddOrUpdateCompany, _companyGetByIds } from "../companyService";
import { _batchAddOrUpdateCompanyTag, _companyTagExport } from "../companyTagService";
import { SERVICE_INSTANCE as DATA_SOURCE_METADATA_SERVICE } from "../dataSourceMetadataService";
import { _fileGetById } from "../fileService";
import { _jobPublicBatchAddJobPublicAndUpdateJob, SERVICE_INSTANCE as JOB_PUBLIC_SERVICE_INSTANCE } from "../jobPublicService";
import { _batchAddOrUpdateJob, _jobGetByIds } from "../jobService";
import { _jobTagBatchAddOrUpdate, _jobTagExport } from "../jobTagService";
import { _taskDataMergeAddOrUpdate, _taskDataMergeGetById } from "../taskDataMergeService";
const { filterCompanyCommentId } = useCompanyComment();
import { SERVICE_INSTANCE as COMPANY_COMMENT_SERVICE_INSTANCE } from "../companyCommentService";
import { DEFAULT_MAX_MERGE_SIZE } from "@/common/config";
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
  });
  handleMap.set(TASK_TYPE_COMPANY_DATA_MERGE, async (dataId) => {
    return mergeDataByDataId(dataId, TASK_TYPE_COMPANY_DATA_MERGE, DATA_TYPE_NAME_COMPANY, COMPANY_FILE_HEADER, companyExcelDataToObjectArray, async (items, taskDataMerge, connection) => {
      //处理数据冲突问题，根据数据来源更新时间来判断
      let targetList = await getMergeDataListForCompany(items, "companyId", async (ids) => {
        return _companyGetByIds({ param: ids, connection });
      });
      await _batchAddOrUpdateCompany({ param: targetList, connection });
      return targetList.length;
    });
  });
  handleMap.set(TASK_TYPE_COMPANY_TAG_DATA_MERGE, async (dataId) => {
    return mergeDataByDataId(dataId, TASK_TYPE_COMPANY_TAG_DATA_MERGE, DATA_TYPE_NAME_COMPANY_TAG, COMPANY_TAG_FILE_HEADER, companyTagExcelDataToObjectArray, async (items, taskDataMerge, connection) => {
      //处理数据冲突问题，根据更新时间合并
      let targetList = await getMergeDataListForTag(items, "companyName", async (companyNames) => {
        let searchParam = new CompanyTagExportBO();
        searchParam.source = taskDataMerge.username;
        searchParam.companyIds = companyNames.map(item => genIdFromText(item));
        return (await _companyTagExport({ param: searchParam, connection })).items;
      })
      if (targetList.length > 0) {
        //如果补充source信息
        targetList.forEach(item => {
          item.source = taskDataMerge.username;
        });
      }
      await _batchAddOrUpdateCompanyTag({ companyTagBOs: targetList, overrideUpdateDatetime: true, connection });
      return targetList.length;
    });
  });
  handleMap.set(TASK_TYPE_JOB_TAG_DATA_MERGE, async (dataId) => {
    return mergeDataByDataId(dataId, TASK_TYPE_JOB_TAG_DATA_MERGE, DATA_TYPE_NAME_JOB_TAG, JOB_TAG_FILE_HEADER, jobTagExcelDataToObjectArray, async (items, taskDataMerge, connection) => {
      //处理数据冲突问题，根据更新时间合并
      let targetList = await getMergeDataListForTag(items, "jobId", async (ids) => {
        let searchParam = new JobTagExportBO();
        searchParam.source = taskDataMerge.username;
        searchParam.jobIds = ids;
        return (await _jobTagExport({ param: searchParam, connection })).items;
      })
      if (targetList.length > 0) {
        //如果补充source信息
        targetList.forEach(item => {
          item.source = taskDataMerge.username;
        });
      }
      await _jobTagBatchAddOrUpdate(targetList, true, { connection });
      return targetList.length;
    });
  });
  handleMap.set(TASK_TYPE_JOB_PUBLIC_DATA_MERGE, async (dataId) => {
    return mergeDataByDataId(dataId, TASK_TYPE_JOB_PUBLIC_DATA_MERGE, DATA_TYPE_NAME_JOB_PUBLIC, JOB_PUBLIC_FILE_HEADER, jobPublicExcelDataToObjectArray, async (items, taskDataMerge, connection) => {
      items.forEach(item => {
        item.sourceType = 0;
        item.source = taskDataMerge.username;
      })
      const targetObject = await getMergeDataListForJobPublic(items, "jobId", async (ids) => {
        return await _jobGetByIds({ param: ids, connection });
      }, async (ids) => {
        const result = await JOB_PUBLIC_SERVICE_INSTANCE._search({ jobIds: ids, sourceType: 0, source: taskDataMerge.username }, { connection });
        return result.items;
      });
      await _jobPublicBatchAddJobPublicAndUpdateJob(targetObject, { connection });
      return targetObject.jobPublicList.length;
    });
  });
  handleMap.set(TASK_TYPE_METADATA_DATA_MERGE, async (dataId) => {
    return handleMetadataMerge({ dataId });
  });
  handleMap.set(TASK_TYPE_COMPANY_COMMENT_DATA_MERGE, async (dataId) => {
    return handleCompanyCommentDataMerge({ dataId });
  });
}

export async function handleCompanyCommentDataMerge({ dataId = null } = {}) {
  return mergeDataByDataId(dataId, TASK_TYPE_COMPANY_COMMENT_DATA_MERGE, null, COMPANY_COMMENT_FILE_HEADER, companyCommentExcelDataToObjectArray, async (items, taskDataMerge, connection) => {
    const filterList = filterCompanyCommentId(items);
    const targetList = await getMergeDataListForCompanyComment(filterList, "id", async (ids) => {
      return COMPANY_COMMENT_SERVICE_INSTANCE._getByIds(ids, { connection });
    });
    if (targetList.length > 0) {
      //如果补充source信息
      targetList.forEach(item => {
        item.source = taskDataMerge.username;
      });
    }
    await COMPANY_COMMENT_SERVICE_INSTANCE._batchAddOrUpdate(targetList, { connection, overrideCreateDatetime: true, overrideUpdateDatetime: true });
    return targetList.length;
  });
}

export async function handleMetadataMerge({ dataId = null } = {}) {
  infoLog(`[TASK DATA MERGE] Task dataId = ${dataId}`);
  const taskDataMerge = await _taskDataMergeGetById({ param: dataId });
  infoLog(`[TASK DATA MERGE] taskDataMerge dataId = ${taskDataMerge.dataId},datetime = ${taskDataMerge.datetime},typeId = ${taskDataMerge.typeId}`);
  const typeId = taskDataMerge.typeId;
  const fileId = taskDataMerge.dataId;
  const file = await _fileGetById({ param: fileId });
  infoLog(`[TASK DATA MERGE] file id = ${file.id},name = ${file.name}`);
  const text = base64decode(file.content);
  const metadata = JSON.parse(text);
  const data = metadata?.data;
  if (!data) {
    throw `can't found metadata data in file,file id = ${file.id}`;
  }
  const dataSourceMetadata = await DATA_SOURCE_METADATA_SERVICE._getById(typeId);
  dataSourceMetadata.data = data;
  await DATA_SOURCE_METADATA_SERVICE._addOrUpdate(dataSourceMetadata);
  infoLog(`[TASK DATA MERGE] merge file name = ${file.name}, id = ${file.id} success`);
  return null;
}

export async function mergeDataByDataId(dataId, taskType, dataTypeName, fileHeader, excelDataToObjectArrayFunction, dataInsertFunction) {
  infoLog(`[TASK DATA MERGE] Task dataId = ${dataId},taskType = ${taskType}`);
  const taskDataMerge = await _taskDataMergeGetById({ param: dataId });
  const config = taskDataMerge.config;
  const actualFileName = config?.fileName ?? dataTypeName;
  infoLog(`[TASK DATA MERGE] taskDataMerge dataId = ${taskDataMerge.dataId},username = ${taskDataMerge.username},repoName = ${taskDataMerge.reponame},datetime = ${taskDataMerge.datetime}`);
  const file = await _fileGetById({ param: taskDataMerge.dataId });
  infoLog(`[TASK DATA MERGE] file id = ${file.id},name = ${file.name}`);
  let base64Content = file.content;
  let excelFileBufferData = await getExcelDataFromZipFile(base64Content, actualFileName);
  let wb = read(excelFileBufferData, { type: "buffer", cellDates: true });
  let validResultObject = validImportData(utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, UTC: true }), fileHeader);
  if (!validResultObject.validResult) {
    infoLog(`[TASK DATA MERGE] valid file name = ${file.name}, id = ${file.id} failure`);
    return `文件校验失败，缺少数据列(${validResultObject.lackColumn.length}):${validResultObject.lackColumn.join(",")}`;
  }
  infoLog(`[TASK DATA MERGE] valid file name = ${file.name}, id = ${file.id} success`);
  const data = utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 2, UTC: true });
  await (await getDb()).transaction(async (tx) => {
    let count = await mergeByChunk({
      taskDataMerge, items: data, mergeFunction: async ({ items }) => {
        return await dataInsertFunction(excelDataToObjectArrayFunction(items, taskDataMerge.datetime, { config }), taskDataMerge, tx);
      }
    })
    taskDataMerge.dataCount = count;
    await _taskDataMergeAddOrUpdate({ param: taskDataMerge, connection: tx });
    infoLog(`[TASK DATA MERGE] merge file name = ${file.name}, id = ${file.id} success,data count = ${count}`);
  });
}

const mergeByChunk = async ({ taskDataMerge, items, mergeFunction } = {}) => {
  let totalResult = 0;
  const total = items.length;
  const perSize = DEFAULT_MAX_MERGE_SIZE;
  const stepCount = Number.parseInt(total / perSize + "") + (total % perSize > 0 ? 1 : 0)
  infoLog(`[TASK DATA MERGE] Task dataId = ${taskDataMerge.id},taskType = ${taskDataMerge.type},total = ${total},perSize = ${perSize},stepCount = ${stepCount}`);
  for (let i = 0; i < stepCount; i++) {
    const start = i * perSize;
    const end = Math.min(total, (i + 1) * perSize);
    const perStepItems = items.slice(start, end);
    infoLog(`[TASK DATA MERGE] Task dataId = ${taskDataMerge.id},taskType = ${taskDataMerge.type},start = ${start},end = ${end},perStepItems.length = ${perStepItems.length}`);
    totalResult += await mergeFunction({ items: perStepItems });
  }
  return totalResult;
}
