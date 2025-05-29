import { CompanyApi, CompanyCommentApi, JobApi, JobPublicApi, JobSnapshotApi } from "@/common/api";
import { JOB_SNAPSHOT_FULL_FETCH_OR_INSERT_MAX_BATCH_SIZE } from "@/common/config";
import { CompanyCommentSearchBO } from "@/common/data/bo/companyCommentSearchBO";
import { CompanyTagExportBO } from "@/common/data/bo/companyTagExportBO";
import { JobSnapshotSearchBO } from "@/common/data/bo/jobSnapshotSearchBO";
import { JobTagExportBO } from "@/common/data/bo/jobTagExportBO";
import { SearchCompanyBO } from "@/common/data/bo/searchCompanyBO";
import { SearchJobBO } from "@/common/data/bo/searchJobBO";
import {
  COMPANY_COMMENT_FILE_HEADER,
  COMPANY_FILE_HEADER, COMPANY_TAG_FILE_HEADER,
  companyCommentDataToExcelJSONArray, companyCommentExcelDataToObjectArray,
  companyDataToExcelJSONArray, companyExcelDataToObjectArray,
  companyTagDataToExcelJSONArray, companyTagExcelDataToObjectArray,
  JOB_FILE_HEADER,
  JOB_PUBLIC_FILE_HEADER,
  JOB_SNAPSHOT_FILE_HEADER,
  JOB_TAG_FILE_HEADER,
  jobDataToExcelJSONArray, jobExcelDataToObjectArray,
  jobPublicDataToExcelJSONArray, jobPublicExcelDataToObjectArray,
  jobSnapshotDataToJSONArray, jobSnapshotDataToObjectArray,
  jobTagDataToExcelJSONArray, jobTagExcelDataToObjectArray,
} from "@/common/excel";
import { useCompanyComment } from "@/common/hooks/companyComment";
import { useJobSnapshot } from '@/common/hooks/jobSnapshot';
import {
  getMergeDataListForCompany,
  getMergeDataListForCompanyComment,
  getMergeDataListForJob,
  getMergeDataListForJobPublic,
  getMergeDataListForJobSnapshot,
  getMergeDataListForTag
} from "@/common/service/dataSyncService";
import { genIdFromText } from "@/common/utils";
const { getFullData: getSnapshotFullData } = useJobSnapshot();
const { filterCompanyCommentId } = useCompanyComment();

export function useData() {

  const getJobDataToExcelJsonArray = async (pageNum, pageSize) => {
    const searchParam = new SearchJobBO();
    searchParam.pageNum = pageNum;
    searchParam.pageSize = pageSize;
    searchParam.orderByColumn = "updateDatetime";
    searchParam.orderBy = "DESC";
    const data = await JobApi.searchJob(searchParam);
    const list = data.items;
    const result = jobDataToExcelJSONArray(list);
    return result;
  }

  const getJobDataTotal = async () => {
    const searchParam = new SearchJobBO();
    searchParam.pageNum = 1;
    searchParam.pageSize = 1;
    const data = await JobApi.searchJob(searchParam);
    return data.total;
  }

  const saveJobData = async (data) => {
    const jobList = jobExcelDataToObjectArray(data);
    const targetList = await getMergeDataListForJob(jobList, "jobId", async (ids) => {
      return JobApi.jobGetByIds(ids);
    });
    await JobApi.batchAddOrUpdateJob(targetList);
    return targetList;
  }

  const getJobPublicDataToExcelJsonArray = async (pageNum, pageSize) => {
    const searchParam = new SearchJobBO();
    searchParam.pageNum = pageNum;
    searchParam.pageSize = pageSize;
    searchParam.orderByColumn = "updateDatetime";
    searchParam.orderBy = "DESC";
    const data = await JobApi.searchJob(searchParam);
    const list = data.items;
    const result = jobPublicDataToExcelJSONArray(list);
    return result;
  }

  const getJobPublicDataTotal = async () => {
    const searchParam = new SearchJobBO();
    searchParam.pageNum = 1;
    searchParam.pageSize = 1;
    const data = await JobApi.searchJob(searchParam);
    return data.total;
  }

  const saveJobPublicData = async (data) => {
    const jobPublicList = jobPublicExcelDataToObjectArray(data);
    jobPublicList.forEach(item => {
      item.sourceType = 0;
      item.source = null;
    })
    const targetObject = await getMergeDataListForJobPublic(jobPublicList, "jobId", async (ids: string[]) => {
      return JobApi.jobGetByIds(ids);
    }, async (ids: string[]) => {
      const result = await JobPublicApi.jobPublicSearch({ jobIds: ids, sourceType: 0, source: null });
      return result.items;
    });
    await JobPublicApi.jobPublicBatchAddJobPublicAndUpdateJob(targetObject);
    return targetObject.jobPublicList;
  }

  const getCompanyDataToExcelJsonArray = async (pageNum, pageSize) => {
    const searchParam = new SearchCompanyBO();
    searchParam.pageNum = pageNum;
    searchParam.pageSize = pageSize;
    searchParam.orderByColumn = "updateDatetime";
    searchParam.orderBy = "DESC";
    const data = await CompanyApi.searchCompany(searchParam);
    const list = data.items;
    const result = companyDataToExcelJSONArray(list);
    return result;
  }

  const getCompanyDataTotal = async () => {
    const searchParam = new SearchCompanyBO();
    searchParam.pageNum = 1;
    searchParam.pageSize = 1;
    const data = await CompanyApi.searchCompany(searchParam);
    return data.total;
  }

  const saveCompanyData = async (data) => {
    const companyBOList = companyExcelDataToObjectArray(data);
    const targetList = await getMergeDataListForCompany(companyBOList, "companyId", async (ids) => {
      return CompanyApi.companyGetByIds(ids);
    });
    await CompanyApi.batchAddOrUpdateCompany(targetList);
    return targetList;
  }

  const getCompanyTagDataToExcelJsonArray = async (pageNum, pageSize) => {
    const searchParam = new CompanyTagExportBO();
    searchParam.pageNum = pageNum;
    searchParam.pageSize = pageSize;
    searchParam.source = "";
    searchParam.isPublic = null;
    const data = await CompanyApi.companyTagExport(searchParam);
    const list = data.items;
    const result = companyTagDataToExcelJSONArray(list);
    return result;
  }

  const getCompanyTagDataTotal = async () => {
    const searchParam = new CompanyTagExportBO();
    searchParam.pageNum = 1;
    searchParam.pageSize = 1;
    searchParam.source = "";
    searchParam.isPublic = null;
    const data = await CompanyApi.companyTagExport(searchParam);
    return data.total;
  }

  const saveCompanyTagData = async (data) => {
    const result = companyTagExcelDataToObjectArray(data);
    const targetList = await getMergeDataListForTag(result, "companyName", async (companyNames) => {
      const searchParam = new CompanyTagExportBO();
      searchParam.source = "";
      searchParam.isPublic = null;
      searchParam.companyIds = companyNames.map(item => genIdFromText(item));
      return (await CompanyApi.companyTagExport(searchParam)).items;
    })
    await CompanyApi.batchAddOrUpdateCompanyTag({ items: targetList, overrideUpdateDatetime: true });
    return targetList;
  }

  const getCompanyCommentDataToExcelJsonArray = async (pageNum, pageSize) => {
    const searchParam = new CompanyCommentSearchBO();
    searchParam.pageNum = pageNum;
    searchParam.pageSize = pageSize;
    searchParam.orderByColumn = "updateDatetime";
    searchParam.orderBy = "DESC";
    const data = await CompanyCommentApi.companyCommentSearch(searchParam);
    const list = data.items;
    const result = companyCommentDataToExcelJSONArray(list);
    return result;
  }

  const getCompanyCommentDataTotal = async () => {
    const searchParam = new CompanyCommentSearchBO();
    searchParam.pageNum = 1;
    searchParam.pageSize = 1;
    const data = await CompanyCommentApi.companyCommentSearch(searchParam);
    return data.total;
  }

  const saveCompanyCommentData = async (data) => {
    const list = companyCommentExcelDataToObjectArray(data);
    const filterList = filterCompanyCommentId(list);
    const targetList = await getMergeDataListForCompanyComment(filterList, "id", async (ids) => {
      return CompanyCommentApi.companyCommentGetByIds(ids);
    });
    await CompanyCommentApi.companyCommentBatchAddOrUpdate({ items: targetList });
    return targetList;
  }

  const getJobTagDataToExcelJsonArray = async (pageNum, pageSize) => {
    const searchParam = new JobTagExportBO();
    searchParam.pageNum = pageNum;
    searchParam.pageSize = pageSize;
    searchParam.source = "";
    searchParam.isPublic = null;
    const data = await JobApi.jobTagExport(searchParam);
    const list = data.items;
    const result = jobTagDataToExcelJSONArray(list);
    return result;
  }

  const getJobTagDataTotal = async () => {
    const searchParam = new JobTagExportBO();
    searchParam.pageNum = 1;
    searchParam.pageSize = 1;
    searchParam.source = "";
    searchParam.isPublic = null;
    const data = await JobApi.jobTagExport(searchParam);
    return data.total;
  }

  const saveJobTagData = async (data) => {
    const result = jobTagExcelDataToObjectArray(data);
    const targetList = await getMergeDataListForTag(result, "jobId", async (ids) => {
      const searchParam = new JobTagExportBO();
      searchParam.source = "";
      searchParam.jobIds = ids;
      searchParam.isPublic = null;
      return (await JobApi.jobTagExport(searchParam)).items;
    })
    await JobApi.jobTagBatchAddOrUpdate({ items: targetList, overrideUpdateDatetime: true });
    return targetList;
  }

  const saveJobSnapshotData = async (data) => {
    const result = jobSnapshotDataToObjectArray(data);
    const targetList = await getMergeDataListForJobSnapshot(result, "id", async (ids) => {
      const searchParam = new JobSnapshotSearchBO();
      searchParam.ids = ids;
      searchParam.skipContent = true;
      return (await JobSnapshotApi.jobSnapshotSearch(searchParam)).items;
    })
    const totalBatches = Math.ceil(targetList.length / JOB_SNAPSHOT_FULL_FETCH_OR_INSERT_MAX_BATCH_SIZE);
    for (let i = 0; i < totalBatches; i++) {
      const start = i * JOB_SNAPSHOT_FULL_FETCH_OR_INSERT_MAX_BATCH_SIZE;
      const end = Math.min(start + JOB_SNAPSHOT_FULL_FETCH_OR_INSERT_MAX_BATCH_SIZE, targetList.length);
      const rangeList = targetList.slice(start, end);
      await JobSnapshotApi.jobSnapshotBatchAddOrUpdate({ items: rangeList, overrideUpdateDatetime: true })
    }
    return targetList;
  }

  const getJobSnapshotDataTotal = async () => {
    const searchParam = new JobSnapshotSearchBO();
    searchParam.pageNum = 1;
    searchParam.pageSize = 1;
    searchParam.skipContent = true;
    const result = await JobSnapshotApi.jobSnapshotSearch(searchParam);
    return result.total;
  }

  const getJobSnapshotDataToJsonArray = async (pageNum, pageSize) => {
    const searchParam = new JobSnapshotSearchBO();
    searchParam.pageNum = pageNum;
    searchParam.pageSize = pageSize;
    searchParam.skipContent = true;
    const data = await JobSnapshotApi.jobSnapshotSearch(searchParam);
    const list = await getSnapshotFullData(data.items);
    const result = jobSnapshotDataToJSONArray(list);
    return result;
  }

  return {
    getJobDataToExcelJsonArray, getJobDataTotal, saveJobData,
    getJobPublicDataToExcelJsonArray, getJobPublicDataTotal, saveJobPublicData,
    getCompanyDataToExcelJsonArray, getCompanyDataTotal, saveCompanyData,
    getCompanyCommentDataToExcelJsonArray, getCompanyCommentDataTotal, saveCompanyCommentData,
    getCompanyTagDataToExcelJsonArray, getCompanyTagDataTotal, saveCompanyTagData,
    getJobTagDataToExcelJsonArray, getJobTagDataTotal, saveJobTagData,
    JOB_FILE_HEADER, COMPANY_FILE_HEADER, COMPANY_TAG_FILE_HEADER,
    JOB_TAG_FILE_HEADER, JOB_SNAPSHOT_FILE_HEADER, JOB_PUBLIC_FILE_HEADER,
    COMPANY_COMMENT_FILE_HEADER,
    saveJobSnapshotData, getJobSnapshotDataTotal, getJobSnapshotDataToJsonArray,
    filterCompanyCommentId
  }
}

