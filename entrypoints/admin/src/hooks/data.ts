import { CompanyApi, JobApi } from "@/common/api";
import { CompanyTagExportBO } from "@/common/data/bo/companyTagExportBO";
import { JobTagExportBO } from "@/common/data/bo/jobTagExportBO";
import { SearchCompanyBO } from "@/common/data/bo/searchCompanyBO";
import { SearchJobBO } from "@/common/data/bo/searchJobBO";
import {
    COMPANY_FILE_HEADER, COMPANY_TAG_FILE_HEADER,
    companyDataToExcelJSONArray, companyExcelDataToObjectArray,
    companyTagDataToExcelJSONArray, companyTagExcelDataToObjectArray,
    JOB_FILE_HEADER,
    JOB_TAG_FILE_HEADER,
    jobDataToExcelJSONArray, jobExcelDataToObjectArray,
    jobTagDataToExcelJSONArray, jobTagExcelDataToObjectArray
} from "@/common/excel";
import {
    getMergeDataListForCompany,
    getMergeDataListForJob, getMergeDataListForTag
} from "@/common/service/dataSyncService";
import { genIdFromText } from "@/common/utils";
export function useData() {

    //10 million
    const MAX_RECORD_COUNT = 10000000;

    const getJobDataToExcelJsonArray = async () => {
        let searchParam = new SearchJobBO();
        searchParam.pageNum = 1;
        searchParam.pageSize = MAX_RECORD_COUNT;
        searchParam.orderByColumn = "updateDatetime";
        searchParam.orderBy = "DESC";
        let data = await JobApi.searchJob(searchParam);
        let list = data.items;
        let result = jobDataToExcelJSONArray(list);
        return result;
    }

    const saveJobData = async (data) => {
        let jobList = jobExcelDataToObjectArray(data);
        let targetList = await getMergeDataListForJob(jobList, "jobId", async (ids) => {
            return JobApi.jobGetByIds(ids);
        });
        await JobApi.batchAddOrUpdateJob(targetList);
        return targetList;
    }

    const getCompanyDataToExcelJsonArray = async () => {
        let searchParam = new SearchCompanyBO();
        searchParam.pageNum = 1;
        searchParam.pageSize = MAX_RECORD_COUNT;
        searchParam.orderByColumn = "updateDatetime";
        searchParam.orderBy = "DESC";
        let data = await CompanyApi.searchCompany(searchParam);
        let list = data.items;
        let result = companyDataToExcelJSONArray(list);
        return result;
    }

    const saveCompanyData = async (data) => {
        let companyBOList = companyExcelDataToObjectArray(data);
        let targetList = await getMergeDataListForCompany(companyBOList, "companyId", async (ids) => {
            return CompanyApi.companyGetByIds(ids);
        });
        await CompanyApi.batchAddOrUpdateCompany(targetList);
        return targetList;
    }

    const getCompanyTagDataToExcelJsonArray = async () => {
        let searchParam = new CompanyTagExportBO();
        searchParam.source = "";
        searchParam.isPublic = null;
        let list = await CompanyApi.companyTagExport(searchParam);
        let result = companyTagDataToExcelJSONArray(list);
        return result;
    }

    const saveCompanyTagData = async (data) => {
        let result = companyTagExcelDataToObjectArray(data);
        let targetList = await getMergeDataListForTag(result, "companyName", async (companyNames) => {
            let searchParam = new CompanyTagExportBO();
            searchParam.source = "";
            searchParam.isPublic = null;
            searchParam.companyIds = companyNames.map(item => genIdFromText(item));
            return await CompanyApi.companyTagExport(searchParam);
        })
        await CompanyApi.batchAddOrUpdateCompanyTag({ items: targetList, overrideUpdateDatetime: true });
        return targetList;
    }

    const getJobTagDataToExcelJsonArray = async () => {
        let searchParam = new JobTagExportBO();
        searchParam.source = "";
        searchParam.isPublic = null;
        let list = await JobApi.jobTagExport(searchParam);
        let result = jobTagDataToExcelJSONArray(list);
        return result;
    }

    const saveJobTagData = async (data) => {
        let result = jobTagExcelDataToObjectArray(data);
        let targetList = await getMergeDataListForTag(result, "jobId", async (ids) => {
            let searchParam = new JobTagExportBO();
            searchParam.source = "";
            searchParam.jobIds = ids;
            searchParam.isPublic = null;
            return await JobApi.jobTagExport(searchParam);
        })
        await JobApi.jobTagBatchAddOrUpdate({ items: targetList, overrideUpdateDatetime: true });
        return targetList;
    }

    return {
        getJobDataToExcelJsonArray, saveJobData, getCompanyDataToExcelJsonArray,
        saveCompanyData, getCompanyTagDataToExcelJsonArray, saveCompanyTagData,
        getJobTagDataToExcelJsonArray, saveJobTagData,
        JOB_FILE_HEADER, COMPANY_FILE_HEADER, COMPANY_TAG_FILE_HEADER, JOB_TAG_FILE_HEADER,
    }
}

