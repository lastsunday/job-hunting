import { CompanyApi, JobApi, JobSnapshotApi } from "@/common/api";
import { CompanyTagExportBO } from "@/common/data/bo/companyTagExportBO";
import { JobTagExportBO } from "@/common/data/bo/jobTagExportBO";
import { SearchCompanyBO } from "@/common/data/bo/searchCompanyBO";
import { SearchJobBO } from "@/common/data/bo/searchJobBO";
import { JobSnapshotSearchBO } from "@/common/data/bo/jobSnapshotSearchBO";
import {
  COMPANY_FILE_HEADER, COMPANY_TAG_FILE_HEADER,
  companyDataToExcelJSONArray, companyExcelDataToObjectArray,
  companyTagDataToExcelJSONArray, companyTagExcelDataToObjectArray,
  JOB_FILE_HEADER,
  JOB_TAG_FILE_HEADER,
  jobDataToExcelJSONArray, jobExcelDataToObjectArray,
  jobTagDataToExcelJSONArray, jobTagExcelDataToObjectArray,
  JOB_SNAPSHOT_FILE_HEADER, jobSnapshotDataToJSONArray, jobSnapshotDataToObjectArray,
  JOB_PUBLIC_FILE_HEADER, jobPublicDataToExcelJSONArray, jobPublicExcelDataToObjectArray,
} from "@/common/excel";
import {
  getMergeDataListForCompany,
  getMergeDataListForJob, getMergeDataListForTag,
  getMergeDataListForJobSnapshot, getMergeDataListForJobPublic
} from "@/common/service/dataSyncService";
import { genIdFromText } from "@/common/utils";
import { useJobSnapshot } from '@/common/hooks/jobSnapshot';
const { getFullData: getSnapshotFullData } = useJobSnapshot();
import { JOB_SNAPSHOT_FULL_FETCH_OR_INSERT_MAX_BATCH_SIZE } from "@/common/config";

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
    const jobList = jobPublicExcelDataToObjectArray(data);
    const targetList = await getMergeDataListForJobPublic(jobList, "jobId", async (ids) => {
      return JobApi.jobGetByIds(ids);
    });
    await JobApi.batchAddOrUpdateJob(targetList);
    return targetList;
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
    getCompanyTagDataToExcelJsonArray, getCompanyTagDataTotal, saveCompanyTagData,
    getJobTagDataToExcelJsonArray, getJobTagDataTotal, saveJobTagData,
    JOB_FILE_HEADER, COMPANY_FILE_HEADER, COMPANY_TAG_FILE_HEADER,
    JOB_TAG_FILE_HEADER, JOB_SNAPSHOT_FILE_HEADER, JOB_PUBLIC_FILE_HEADER,
    saveJobSnapshotData, getJobSnapshotDataTotal, getJobSnapshotDataToJsonArray
  }
}

