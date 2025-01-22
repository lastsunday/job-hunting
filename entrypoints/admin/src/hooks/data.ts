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

    const getJobDataToExcelJsonArray = async (pageNum, pageSize) => {
        let searchParam = new SearchJobBO();
        searchParam.pageNum = pageNum;
        searchParam.pageSize = pageSize;
        searchParam.orderByColumn = "updateDatetime";
        searchParam.orderBy = "DESC";
        let data = await JobApi.searchJob(searchParam);
        let list = data.items;
        let result = jobDataToExcelJSONArray(list);
        return result;
    }

    const getJobDataTotal = async () => {
        let searchParam = new SearchJobBO();
        searchParam.pageNum = 1;
        searchParam.pageSize = 1;
        let data = await JobApi.searchJob(searchParam);
        return data.total;
    }

    const saveJobData = async (data) => {
        let jobList = jobExcelDataToObjectArray(data);
        let targetList = await getMergeDataListForJob(jobList, "jobId", async (ids) => {
            return JobApi.jobGetByIds(ids);
        });
        await JobApi.batchAddOrUpdateJob(targetList);
        return targetList;
    }

    const getCompanyDataToExcelJsonArray = async (pageNum, pageSize) => {
        let searchParam = new SearchCompanyBO();
        searchParam.pageNum = pageNum;
        searchParam.pageSize = pageSize;
        searchParam.orderByColumn = "updateDatetime";
        searchParam.orderBy = "DESC";
        let data = await CompanyApi.searchCompany(searchParam);
        let list = data.items;
        let result = companyDataToExcelJSONArray(list);
        return result;
    }

    const getCompanyDataTotal = async () => {
        let searchParam = new SearchCompanyBO();
        searchParam.pageNum = 1;
        searchParam.pageSize = 1;
        let data = await CompanyApi.searchCompany(searchParam);
        return data.total;
    }

    const saveCompanyData = async (data) => {
        let companyBOList = companyExcelDataToObjectArray(data);
        let targetList = await getMergeDataListForCompany(companyBOList, "companyId", async (ids) => {
            return CompanyApi.companyGetByIds(ids);
        });
        await CompanyApi.batchAddOrUpdateCompany(targetList);
        return targetList;
    }

    const getCompanyTagDataToExcelJsonArray = async (pageNum, pageSize) => {
        let searchParam = new CompanyTagExportBO();
        searchParam.pageNum = pageNum;
        searchParam.pageSize = pageSize;
        searchParam.source = "";
        searchParam.isPublic = null;
        let data = await CompanyApi.companyTagExport(searchParam);
        let list = data.items;
        let result = companyTagDataToExcelJSONArray(list);
        return result;
    }

    const getCompanyTagDataTotal = async () => {
        let searchParam = new CompanyTagExportBO();
        searchParam.pageNum = 1;
        searchParam.pageSize = 1;
        searchParam.source = "";
        searchParam.isPublic = null;
        let data = await CompanyApi.companyTagExport(searchParam);
        return data.total;
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

    const getJobTagDataToExcelJsonArray = async (pageNum, pageSize) => {
        let searchParam = new JobTagExportBO();
        searchParam.pageNum = pageNum;
        searchParam.pageSize = pageSize;
        searchParam.source = "";
        searchParam.isPublic = null;
        let data = await JobApi.jobTagExport(searchParam);
        let list = data.items;
        let result = jobTagDataToExcelJSONArray(list);
        return result;
    }

    const getJobTagDataTotal = async () => {
        let searchParam = new JobTagExportBO();
        searchParam.pageNum = 1;
        searchParam.pageSize = 1;
        searchParam.source = "";
        searchParam.isPublic = null;
        let data = await JobApi.jobTagExport(searchParam);
        return data.total;
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
        getJobDataToExcelJsonArray, getJobDataTotal, saveJobData,
        getCompanyDataToExcelJsonArray, getCompanyDataTotal, saveCompanyData,
        getCompanyTagDataToExcelJsonArray, getCompanyTagDataTotal, saveCompanyTagData,
        getJobTagDataToExcelJsonArray, getJobTagDataTotal, saveJobTagData,
        JOB_FILE_HEADER, COMPANY_FILE_HEADER, COMPANY_TAG_FILE_HEADER, JOB_TAG_FILE_HEADER,
    }
}

