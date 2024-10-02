import { debugLog, errorLog, infoLog, isDebug } from "../../common/log"
import { SearchJobBO } from "../../common/data/bo/searchJobBO";
import { SearchCompanyBO } from "../../common/data/bo/searchCompanyBO";
import { SearchCompanyTagBO } from "../../common/data/bo/searchCompanyTagBO";
import { JobApi, CompanyApi } from "../../common/api";
import { BACKGROUND } from "../../common/api/bridgeCommon";
import { MAX_RECORD_COUNT } from "../../common";
import { utils, writeXLSX } from "xlsx";
import { jobDataToJobExcelJSONArray, companyDataToJobExcelJSONArray, companyTagDataToJobExcelJSONArray } from "../../common/excel";
import { EXCEPTION, GithubApi } from "../../common/api/github";
import { getToken, setToken } from "./authService";
import dayjs from "dayjs";

export const TaskService = {

}

function calculateMaxYear(list) {
    let validValueArray = list.filter(item => { return item.name.match("^2[0-9]{3}$") });
    let maxValue = null;
    if (validValueArray.length > 0) {
        if (validValueArray.length > 1) {
            validValueArray.sort((a1, a2) => { return Number.parseInt(a2.name) - Number.parseInt(a1.name) });
        }
        maxValue = Number.parseInt(validValueArray[0].name);
    }
    return maxValue;
}

function calculateMaxMonthAndDay(list) {
    let validValueArray = list.filter(item => { return item.name.match("^[01][0-9]-[0123][0-9]$") });
    let maxValue = null;
    if (validValueArray.length > 0) {
        if (validValueArray.length > 1) {
            validValueArray.sort((a1, a2) => { return Number.parseInt(a2.name.replace("-", "")) - Number.parseInt(a1.name.replace("-", "")) });
        }
        maxValue = validValueArray[0].name;
    }
    return maxValue;
}

export async function calculateTaskInfo({ userName, repoName }) {
    let startDatetime = null;
    let endDatetime = dayjs(new Date()).startOf("day").toDate();
    try {
        let yearList = await GithubApi.listRepoContents(userName, repoName, "/", { getTokenFunction: getToken, setTokenFunction: setToken, });
        let maxYear = calculateMaxYear(yearList);
        if (maxYear) {
            let monthAndDayList = await GithubApi.listRepoContents(userName, repoName, `/${maxYear}`, { getTokenFunction: getToken, setTokenFunction: setToken, });
            let maxMonthAndDay = calculateMaxMonthAndDay(monthAndDayList);
            if (maxMonthAndDay) {
                //skip
            } else {
                maxMonthAndDay = "01-01"
            }
            let yearMonthDay = `${maxYear}-${maxMonthAndDay}`
            startDatetime = dayjs(yearMonthDay).startOf("day").toDate();
        }
    } catch (e) {
        if (e == EXCEPTION.NOT_FOUND) {
            //skip
        } else {
            throw e;
        }
    }
    return {
        startDatetime: startDatetime,
        endDatetime: endDatetime
    }
}

async function convertJsonObjectToExcelBase64Data(result) {
    const ws = utils.json_to_sheet(result);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Data");
    return writeXLSX(wb, { type: "base64" });
}

async function getJobData({ startDatetime, endDatetime }) {
    let searchParam = new SearchJobBO();
    searchParam.pageNum = 1;
    searchParam.pageSize = MAX_RECORD_COUNT;
    searchParam.startDatetimeForUpdate = startDatetime;
    searchParam.endDatetimeForUpdate = endDatetime;
    searchParam.orderByColumn = "updateDatetime";
    searchParam.orderBy = "DESC";
    return JobApi.searchJob(searchParam, {
        invokeEnv: BACKGROUND,
    });
}

async function getCompanyData({ startDatetime, endDatetime }) {
    let searchParam = new SearchCompanyBO();
    searchParam.pageNum = 1;
    searchParam.pageSize = MAX_RECORD_COUNT;
    searchParam.startDatetimeForUpdate = startDatetime;
    searchParam.endDatetimeForUpdate = endDatetime;
    searchParam.orderByColumn = "updateDatetime";
    searchParam.orderBy = "DESC";
    return CompanyApi.searchCompany(searchParam, {
        invokeEnv: BACKGROUND,
    });
}

async function getCompanyTagData({ startDatetime, endDatetime }) {
    let searchParam = new SearchCompanyTagBO();
    searchParam.pageNum = 1;
    searchParam.pageSize = MAX_RECORD_COUNT;
    searchParam.startDatetimeForUpdate = startDatetime;
    searchParam.endDatetimeForUpdate = endDatetime;
    searchParam.orderByColumn = "updateDatetime";
    searchParam.orderBy = "DESC";
    return CompanyApi.searchCompanyTag(searchParam, {
        invokeEnv: BACKGROUND,
    });
}

async function uploadData({ userName, repoName, dirPath, dataTypeName, dataList, jsonObjectToExcelJsonArrayFunction }) {
    if (dataList.length > 0) {
        infoLog(`[Task Data Upload ${dataTypeName}] data length = ${dataList.length}`);
        let result = jsonObjectToExcelJsonArrayFunction(dataList);
        let excelData = await convertJsonObjectToExcelBase64Data(result);
        let filePath = `${dirPath}/${dataTypeName}.xlsx`;
        try {
            let result = await GithubApi.createFileContent(userName, repoName, filePath, excelData, "upload job data", { getTokenFunction: getToken, setTokenFunction: setToken, });
            infoLog(`[Task Data Upload ${dataTypeName}]  create file ${filePath} success`);
            return result;
        } catch (e) {
            if (e == EXCEPTION.CREATION_FAILED) {
                infoLog(`[Task Data Upload ${dataTypeName}]  create file ${filePath} failure`);
            } else {
                throw e;
            }
        }
    } else {
        infoLog(`[Task Data Upload ${dataTypeName}] no data`);
    }
}

export async function runDataUploadTask({ userName, repoName, startDatetime, endDatetime }) {
    try {
        if (isDebug()) {
            debugLog("[Task Data] runDataUploadTask");
            debugLog(`[Task Data] startDatetime = ${startDatetime}`);
            debugLog(`[Task Data] endDatetime = ${endDatetime}`);
        }
        let dirPath = `/${dayjs(endDatetime).format("YYYY")}/${dayjs(endDatetime).format("MM-DD")}`;
        try {
            await GithubApi.getRepo(userName, repoName, { getTokenFunction: getToken, setTokenFunction: setToken, });
            infoLog(`[Task Data] repo ${repoName} exists`);
        } catch (e) {
            infoLog(`[Task Data] repo ${repoName} exists not exists`);
            infoLog(`[Task Data] create a new repo ${repoName}`);
            if (e == EXCEPTION.NOT_FOUND) {
                await GithubApi.newRepo(repoName, { getTokenFunction: getToken, setTokenFunction: setToken, });
                infoLog(`create a new repo ${repoName} success`);
            } else {
                throw e;
            }
        }
        await uploadData({
            userName, repoName, dirPath,
            dataTypeName: "job",
            dataList: (await getJobData({ startDatetime, endDatetime })).items,
            jsonObjectToExcelJsonArrayFunction: jobDataToJobExcelJSONArray
        });
        await uploadData({
            userName, repoName, dirPath,
            dataTypeName: "company",
            dataList: (await getCompanyData({ startDatetime, endDatetime })).items,
            jsonObjectToExcelJsonArrayFunction: companyDataToJobExcelJSONArray
        });
        await uploadData({
            userName, repoName, dirPath,
            dataTypeName: "company-tag",
            dataList: (await getCompanyTagData({ startDatetime, endDatetime })).items,
            jsonObjectToExcelJsonArrayFunction: companyTagDataToJobExcelJSONArray
        });
    } catch (e) {
        errorLog(e);
    }
}