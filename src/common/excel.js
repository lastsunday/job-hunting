import { Job } from "../common/data/domain/job";
import { CompanyBO } from "../common/data/bo/companyBO";
import { CompanyTagBO } from "../common/data/bo/companyTagBO";
import { genIdFromText, convertDateStringToDateObject } from "../common/utils"

export const validImportData = (data, validArray) => {
    let colCount = 0;
    let lackColumnMap = new Map();
    for (let i = 0; i < validArray.length; i++) {
        lackColumnMap.set(validArray[i], null);
    }
    if (data.length > 0) {
        let headerRowArray = data[0];
        for (let i = 0; i < headerRowArray.length; i++) {
            let header = headerRowArray[i];
            if (lackColumnMap.has(header)) {
                colCount++;
                lackColumnMap.delete(header);
            }
        }
    }
    return { validResult: colCount == validArray.length, lackColumn: lackColumnMap.keys().toArray() };
}

export const JOB_FILE_HEADER = [
    "职位自编号",
    "发布平台",
    "职位访问地址",
    "职位",
    "公司",
    "地区",
    "地址",
    "经度",
    "纬度",
    "职位描述",
    "学历",
    "所需经验",
    "最低薪资",
    "最高薪资",
    "首次发布时间",
    "招聘人",
    "招聘公司",
    "招聘者职位",
    "首次扫描日期",
    "记录更新日期",
];

export const jobDataToExcelJSONArray = (list) => {
    let result = [];
    for (let i = 0; i < list.length; i++) {
        let item = list[i];
        result.push({
            职位自编号: item.jobId,
            发布平台: item.jobPlatform,
            职位访问地址: item.jobUrl,
            职位: item.jobName,
            公司: item.jobCompanyName,
            地区: item.jobLocationName,
            地址: item.jobAddress,
            经度: item.jobLongitude,
            纬度: item.jobLatitude,
            职位描述: item.jobDescription,
            学历: item.jobDegreeName,
            所需经验: item.jobYear,
            最低薪资: item.jobSalaryMin,
            最高薪资: item.jobSalaryMax,
            几薪: item.jobSalaryTotalMonth,
            首次发布时间: item.jobFirstPublishDatetime,
            招聘人: item.bossName,
            招聘公司: item.bossCompanyName,
            招聘者职位: item.bossPosition,
            首次扫描日期: item.createDatetime,
            记录更新日期: item.updateDatetime,
        });
    }
    return result;
}

export const jobExcelDataToObjectArray = (data) => {
    let jobList = [];
    for (let i = 0; i < data.length; i++) {
        let dataItem = data[i];
        let item = new Job();
        item.jobId = dataItem['职位自编号'];
        item.jobPlatform = dataItem['发布平台'];
        item.jobUrl = dataItem['职位访问地址'];
        item.jobName = dataItem['职位'];
        item.jobCompanyName = dataItem['公司'];
        item.jobLocationName = dataItem['地区'];
        item.jobAddress = dataItem['地址'];
        item.jobLongitude = dataItem['经度'];
        item.jobLatitude = dataItem['纬度'];
        item.jobDescription = dataItem['职位描述'];
        item.jobDegreeName = dataItem['学历'];
        item.jobYear = dataItem['所需经验'];
        item.jobSalaryMin = dataItem['最低薪资'];
        item.jobSalaryMax = dataItem['最高薪资'];
        item.jobSalaryTotalMonth = dataItem['几薪'];
        item.jobFirstPublishDatetime = dataItem['首次发布时间'];
        item.bossName = dataItem['招聘人'];
        item.bossCompanyName = dataItem['招聘公司'];
        item.bossPosition = dataItem['招聘者职位'];
        item.createDatetime = dataItem['首次扫描日期'];
        item.updateDatetime = dataItem['记录更新日期'];
        jobList.push(item);
    }
    return jobList;
}

export const COMPANY_FILE_HEADER = [
    "公司",
    "公司描述",
    "成立时间",
    "经营状态",
    "法人",
    "统一社会信用代码",
    "官网",
    "社保人数",
    "自身风险数",
    "关联风险数",
    "地址",
    "经营范围",
    "纳税人识别号",
    "所属行业",
    "工商注册号",
    "经度",
    "纬度",
    "数据来源地址",
    "数据来源平台",
    "数据来源记录编号",
    "数据来源更新时间",
];

export const companyDataToExcelJSONArray = (list) => {
    let result = [];
    for (let i = 0; i < list.length; i++) {
        let item = list[i];
        result.push({
            公司: item.companyName,
            公司描述: item.companyDesc,
            成立时间: item.companyStartDate,
            经营状态: item.companyStatus,
            法人: item.companyLegalPerson,
            统一社会信用代码: item.companyUnifiedCode,
            官网: item.companyWebSite,
            社保人数: item.companyInsuranceNum,
            自身风险数: item.companySelfRisk,
            关联风险数: item.companyUnionRisk,
            地址: item.companyAddress,
            经营范围: item.companyScope,
            纳税人识别号: item.companyTaxNo,
            所属行业: item.companyIndustry,
            工商注册号: item.companyLicenseNumber,
            经度: item.companyLongitude,
            纬度: item.companyLatitude,
            数据来源地址: item.sourceUrl,
            数据来源平台: item.sourcePlatform,
            数据来源记录编号: item.sourceRecordId,
            数据来源更新时间: item.sourceRefreshDatetime,
        });
    }
    return result;
}

export const companyExcelDataToObjectArray = (data) => {
    let companyBOList = [];
    for (let i = 0; i < data.length; i++) {
        let dataItem = data[i];
        let item = new CompanyBO();
        item.companyId = genIdFromText(dataItem['公司']);
        item.companyName = dataItem['公司'];
        item.companyDesc = dataItem['公司描述'];
        item.companyStartDate = convertDateStringToDateObject(dataItem['成立时间']);
        item.companyStatus = dataItem['经营状态'];
        item.companyLegalPerson = dataItem['法人'];
        item.companyUnifiedCode = dataItem['统一社会信用代码'];
        item.companyWebSite = dataItem['官网'];
        item.companyInsuranceNum = dataItem['社保人数'];
        item.companySelfRisk = dataItem['自身风险数'];
        item.companyUnionRisk = dataItem['关联风险数'];
        item.companyAddress = dataItem['地址'];
        item.companyScope = dataItem['经营范围'];
        item.companyTaxNo = dataItem['纳税人识别号'];
        item.companyIndustry = dataItem['所属行业'];
        item.companyLicenseNumber = dataItem['工商注册号'];
        item.companyLongitude = dataItem['经度'];
        item.companyLatitude = dataItem['纬度'];
        item.sourceUrl = dataItem['数据来源地址'];
        item.sourcePlatform = dataItem['数据来源平台'];
        item.sourceRecordId = dataItem['数据来源记录编号'];
        item.sourceRefreshDatetime = convertDateStringToDateObject(dataItem['数据来源更新时间']);
        companyBOList.push(item);
    }
    return companyBOList;
}

export const COMPANY_TAG_FILE_HEADER = [
    "公司",
    "标签",
];

export const companyTagDataToExcelJSONArray = (list) => {
    let result = [];
    for (let i = 0; i < list.length; i++) {
        let item = list[i];
        result.push({
            公司: item.companyName,
            标签: item.tagNameArray.join(","),
        });
    }
    return result;
}

export const companyTagExcelDataToObjectArray = (data) => {
    let companyTagBOList = [];
    for (let i = 0; i < data.length; i++) {
        let dataItem = data[i];
        let item = new CompanyTagBO();
        item.companyName = dataItem['公司'];
        item.tags = dataItem['标签'].split(",");
        companyTagBOList.push(item);
    }

    return companyTagBOList;
}