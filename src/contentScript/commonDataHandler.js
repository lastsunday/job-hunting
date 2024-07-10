import {
  PLATFORM_51JOB,
  PLATFORM_BOSS,
  PLATFORM_LAGOU,
  PLATFORM_ZHILIAN,
  PLATFORM_JOBSDB,
  PLATFORM_LIEPIN,
  PLATFORM_AIQICHA,
} from "../common";
import {
  JOB_STATUS_DESC_NEWEST
} from "./common";
import { Job } from "../common/data/domain/job";
import { CompanyApi, JobApi } from "../common/api";
import { infoLog } from "../common/log";
import dayjs from "dayjs";
import sha256 from "crypto-js/sha256";
import { Company } from "../common/data/domain/company";
import {
  convertDateStringToDateObject,
  convertPureJobDetailUrl,
} from "../common/utils";
import { CompanyTagBO } from "../common/data/bo/companyTagBO";
import { httpFetchGetText } from "../common/api/common";

const SALARY_MATCH = /(?<min>[0-9\.]*)(?<minUnit>\D*)(?<max>[0-9\.]*)(?<maxUnit>\D*)(?<month>\d*)/;
const JOB_YEAR_MATCH = /(?<min>[0-9\.]*)\D*(?<max>[0-9\.]*)/;
const AIQICHA_PAGE_DATA_MATCH = /window.pageData = (?<data>\{.*\})/;

//请求中断列表
let abortFunctionHandlerMap = new Map();

export function stopAndCleanAbortFunctionHandler() {
  if (abortFunctionHandlerMap && abortFunctionHandlerMap.size > 0) {
    //中断上一次的查询请求
    abortFunctionHandlerMap.forEach((value, key, map) => {
      key();
    });
  }
  abortFunctionHandlerMap.clear();
}

export function addAbortFunctionHandler(abortFunctionHandler) {
  abortFunctionHandlerMap.set(abortFunctionHandler, null);
}

export function deleteAbortFunctionHandler(abortFunctionHandler) {
  abortFunctionHandlerMap.delete(abortFunctionHandler);
}

export async function saveBrowseJob(list, platform) {
  infoLog(
    "saveBrowseJob start,record size = " +
    list.length +
    ",platform = " +
    platform
  );
  let jobs;
  if (PLATFORM_51JOB == platform) {
    jobs = handle51JobData(list);
  } else if (PLATFORM_BOSS == platform) {
    jobs = handleBossData(list);
  } else if (PLATFORM_ZHILIAN == platform) {
    jobs = handleZhilianData(list);
  } else if (PLATFORM_LAGOU == platform) {
    jobs = handleLagouData(list);
  } else if (PLATFORM_JOBSDB == platform) {
    jobs = handleJobsdb(list);
  } else if (PLATFORM_LIEPIN == platform) {
    jobs = handleLiepin(list);
  } else {
    //skip
  }
  await JobApi.batchAddOrUpdateJobBrowse(jobs);
  infoLog("saveBrowseJob success,record size = " + list.length);
}

function genId(id, platform) {
  return platform + "_" + id;
}

export function getJobIds(list, platform) {
  let result = [];
  for (let i = 0; i < list.length; i++) {
    let item = list[i];
    let jobId;
    if (PLATFORM_51JOB == platform) {
      jobId = item.jobId;
    } else if (PLATFORM_BOSS == platform) {
      jobId = item.value.zpData.jobInfo.encryptId;
    } else if (PLATFORM_ZHILIAN == platform) {
      jobId = item.jobId;
    } else if (PLATFORM_LAGOU == platform) {
      jobId = item.positionId;
    } else if (PLATFORM_JOBSDB == platform) {
      jobId = item.id;
    } else if (PLATFORM_LIEPIN == platform) {
      jobId = item.job.jobId;
    } else {
      //skip
    }
    result.push(genId(jobId, platform));
  }
  return result;
}

function handleLiepin(list) {
  let jobs = [];
  for (let i = 0; i < list.length; i++) {
    let job = new Job();
    let item = list[i];
    const {
      jobId,
      link,
      title,
      dq,
      requireEduLevel,
      requireWorkYears,
      salary,
      refreshTime,
      jobDesc, //访问详情页面而来的
    } = item.job;
    const { compName } = item.comp;
    const { recruiterName, recruiterTitle } = item.recruiter;
    job.jobId = genId(jobId, PLATFORM_LIEPIN);
    job.jobPlatform = PLATFORM_LIEPIN;
    job.jobUrl = convertPureJobDetailUrl(link);
    job.jobName = title;
    job.jobCompanyName = compName;
    job.jobLocationName = dq;
    job.jobAddress = dq;
    job.jobLongitude = "";
    job.jobLatitude = "";
    job.jobDescription = jobDesc;
    job.jobDegreeName = requireEduLevel;
    //handle job year
    let jobYearGroups = requireWorkYears?.match(JOB_YEAR_MATCH)?.groups;
    if (jobYearGroups) {
      job.jobYear = jobYearGroups.min;
    } else {
      //skip
    }
    //handle salary
    //TODO salary content was complex,not handle all situation
    if (salary) {
      let targetSalary = salary.replaceAll(",", "").replaceAll("$", "");
      let groups = targetSalary.match(SALARY_MATCH)?.groups;
      if (groups) {
        let coefficient;
        let minUnitCoefficient;
        let maxUnitCoefficient;
        if (salary.includes("per hour")) {
          //一天8小时工作5天
          coefficient = 1 * 8 * 5;
        } else {
          coefficient = 1;
        }
        if (groups?.minUnit.includes("k")) {
          minUnitCoefficient = 1000;
        } else {
          if (groups?.minUnit.includes("-") && groups?.maxUnit.includes("k")) {
            minUnitCoefficient = 1000;
          } else {
            minUnitCoefficient = 1;
          }
        }
        if (groups?.maxUnit.includes("k")) {
          maxUnitCoefficient = 1000;
        } else {
          maxUnitCoefficient = 1;
        }
        job.jobSalaryMin =
          Number.parseInt(groups?.min) * coefficient * minUnitCoefficient;
        job.jobSalaryMax =
          Number.parseInt(groups?.max) * coefficient * maxUnitCoefficient;
      } else {
        //skip
      }
    }
    if (salary.endsWith("薪")) {
      let groups = salary.match(SALARY_MATCH)?.groups;
      job.jobSalaryTotalMonth = groups.month;
    } else {
      job.jobSalaryTotalMonth = "";
    }
    //暂未找到首次发布时间，用更新时间代替
    job.jobFirstPublishDatetime = convertDateStringToDateObject(refreshTime);
    job.bossName = recruiterName;
    job.bossCompanyName = compName;
    job.bossPosition = recruiterTitle;
    jobs.push(job);
  }
  return jobs;
}

function handleJobsdb(list) {
  let jobs = [];
  for (let i = 0; i < list.length; i++) {
    let job = new Job();
    let item = list[i];
    const { id, jobUrl, title, jobDetail, listingDate, salary } = item;
    const { description: companyFullName } = item.advertiser;
    const { countryCode: city, label: positionAddress } = item.jobLocation;
    job.jobId = genId(id, PLATFORM_JOBSDB);
    job.jobPlatform = PLATFORM_JOBSDB;
    job.jobUrl = convertPureJobDetailUrl(jobUrl);
    job.jobName = title;
    job.jobCompanyName = companyFullName;
    job.jobLocationName = city;
    job.jobAddress = positionAddress;
    job.jobLongitude = "";
    job.jobLatitude = "";
    job.jobDescription = jobDetail;
    job.jobDegreeName = "";
    job.jobYear = "";
    //handle salary
    //TODO salary content was complex,not handle all situation
    let targetSalary = salary.replaceAll(",", "").replaceAll("$", "");
    let groups = targetSalary.match(SALARY_MATCH)?.groups;
    if (groups) {
      let coefficient;
      let minUnitCoefficient;
      let maxUnitCoefficient;
      if (salary.includes("per hour")) {
        //一天8小时工作5天
        coefficient = 1 * 8 * 5;
      } else {
        coefficient = 1;
      }
      if (groups?.minUnit.includes("k")) {
        minUnitCoefficient = 1000;
      } else {
        minUnitCoefficient = 1;
      }
      if (groups?.maxUnit.includes("k")) {
        maxUnitCoefficient = 1000;
      } else {
        maxUnitCoefficient = 1;
      }
      job.jobSalaryMin =
        Number.parseInt(groups?.min) * coefficient * minUnitCoefficient;
      job.jobSalaryMax =
        Number.parseInt(groups?.max) * coefficient * maxUnitCoefficient;
    } else {
      //skip
    }
    job.jobSalaryTotalMonth = null;
    job.jobFirstPublishDatetime = convertDateStringToDateObject(listingDate);
    job.bossName = "";
    job.bossCompanyName = companyFullName;
    job.bossPosition = null;
    jobs.push(job);
  }
  return jobs;
}

function handleLagouData(list) {
  let jobs = [];
  for (let i = 0; i < list.length; i++) {
    let job = new Job();
    let item = list[i];
    const {
      positionId,
      positionName,
      companyFullName,
      city,
      positionAddress,
      longitude,
      latitude,
      positionDetail,
      education,
      workYear,
      salary,
      publisherId,
      createTime,
    } = item;
    job.jobId = genId(positionId, PLATFORM_LAGOU);
    job.jobPlatform = PLATFORM_LAGOU;
    job.jobUrl = "https://www.lagou.com/wn/jobs/" + positionId + ".html";
    job.jobName = positionName;
    job.jobCompanyName = companyFullName;
    job.jobLocationName = city;
    job.jobAddress = positionAddress;
    job.jobLongitude = longitude;
    job.jobLatitude = latitude;
    job.jobDescription = positionDetail;
    job.jobDegreeName = education;
    //handle job year
    let jobYearGroups = workYear.match(JOB_YEAR_MATCH)?.groups;
    if (jobYearGroups) {
      job.jobYear = jobYearGroups.min;
    } else {
      //skip
    }
    //handle salary
    let groups = salary.match(SALARY_MATCH)?.groups;
    if (groups) {
      //unit is K,1K = 1000
      job.jobSalaryMin = Number.parseInt(groups?.min) * 1000;
      job.jobSalaryMax = Number.parseInt(groups?.max) * 1000;
    } else {
      //skip
    }
    job.jobSalaryTotalMonth = null;
    job.jobFirstPublishDatetime = convertDateStringToDateObject(createTime);
    job.bossName = publisherId;
    job.bossCompanyName = companyFullName;
    job.bossPosition = null;
    jobs.push(job);
  }
  return jobs;
}

function handleZhilianData(list) {
  let jobs = [];
  for (let i = 0; i < list.length; i++) {
    let job = new Job();
    let item = list[i];
    const {
      jobId,
      positionUrl,
      name,
      companyName,
      workCity,
      streetName,
      jobSummary,
      education,
      workingExp,
      salaryReal,
      firstPublishTime,
      salaryCount,
    } = item;
    const { staffName, hrJob } = item.staffCard;
    job.jobId = genId(jobId, PLATFORM_ZHILIAN);
    job.jobPlatform = PLATFORM_ZHILIAN;
    job.jobUrl = convertPureJobDetailUrl(positionUrl).replace(
      "http:",
      "https:"
    );
    job.jobName = name;
    job.jobCompanyName = companyName;
    job.jobLocationName = workCity;
    job.jobAddress = streetName;
    job.jobLongitude = null;
    job.jobLatitude = null;
    job.jobDescription = jobSummary;
    job.jobDegreeName = education;
    //handle job year
    let jobYearGroups = workingExp.match(JOB_YEAR_MATCH)?.groups;
    if (jobYearGroups) {
      job.jobYear = jobYearGroups.min;
    } else {
      //skip
    }
    //handle salary
    let groups = salaryReal.match(SALARY_MATCH)?.groups;
    if (groups) {
      job.jobSalaryMin = Number.parseInt(groups?.min);
      job.jobSalaryMax = Number.parseInt(groups?.max);
    } else {
      //skip
    }
    //handle salary month
    let groupsSalaryCount = salaryCount.match(/(?<count>\d*)/)?.groups;
    job.jobSalaryTotalMonth = groupsSalaryCount.count;
    job.jobFirstPublishDatetime = convertDateStringToDateObject(
      firstPublishTime
    );
    job.bossName = staffName;
    job.bossCompanyName = companyName;
    job.bossPosition = hrJob;
    jobs.push(job);
  }
  return jobs;
}

function handleBossData(list) {
  let jobs = [];
  for (let i = 0; i < list.length; i++) {
    let job = new Job();
    let item = list[i];
    let zpData = item.value.zpData;
    const { brandName } = zpData.brandComInfo;
    const { name, brandName: bossBranchName, title } = zpData.bossInfo;
    const {
      encryptId,
      jobName,
      locationName,
      address,
      longitude,
      latitude,
      postDescription,
      degreeName,
      experienceName,
      salaryDesc,
      jobStatusDesc,
      jobUrl,
    } = zpData.jobInfo;
    job.jobId = genId(encryptId, PLATFORM_BOSS);
    job.jobPlatform = PLATFORM_BOSS;
    job.jobUrl = convertPureJobDetailUrl(jobUrl);
    job.jobName = jobName;
    job.jobCompanyName = brandName;
    job.jobLocationName = locationName;
    job.jobAddress = address;
    job.jobLongitude = longitude;
    job.jobLatitude = latitude;
    job.jobDescription = postDescription;
    job.jobDegreeName = degreeName;
    //handle job year
    let jobYearGroups = experienceName.match(JOB_YEAR_MATCH)?.groups;
    if (jobYearGroups) {
      job.jobYear = jobYearGroups.min;
    } else {
      //skip
    }
    //handle salary
    let groups = salaryDesc.match(SALARY_MATCH)?.groups;
    if (groups) {
      let coefficient;
      if (salaryDesc.includes("元") && salaryDesc.includes("天")) {
        //一个月算20天工作日，一般一周5天，有些特殊的6天工作
        coefficient = 1 * 20;
      } else if (salaryDesc.includes("元")) {
        coefficient = 1;
      } else {
        coefficient = 1000;
      }
      job.jobSalaryMin = Number.parseInt(groups?.min) * coefficient;
      job.jobSalaryMax = Number.parseInt(groups?.max) * coefficient;
      job.jobSalaryTotalMonth = groups?.month;
    } else {
      //skip
    }
    if (jobStatusDesc == JOB_STATUS_DESC_NEWEST.key) {
      //招聘状态为最新，则代表一周内发布的职位。记录入库的时间设置取今天零点。
      job.jobFirstPublishDatetime = dayjs(new Date()).startOf("day").toDate();
    } else {
      job.jobFirstPublishDatetime = null;
    }
    job.bossName = name;
    job.bossCompanyName = bossBranchName;
    job.bossPosition = title;
    jobs.push(job);
  }
  return jobs;
}

function handle51JobData(list) {
  let jobs = [];
  for (let i = 0; i < list.length; i++) {
    let job = new Job();
    let item = list[i];
    const {
      jobId,
      jobHref,
      jobName,
      fullCompanyName,
      jobAreaString,
      lat,
      lon,
      jobDescribe,
      degreeString,
      jobSalaryMin,
      jobSalaryMax,
      hrName,
      hrPosition,
      confirmDateString,
      provideSalaryString,
      workYearString,
    } = item;
    job.jobId = genId(jobId, PLATFORM_51JOB);
    job.jobPlatform = PLATFORM_51JOB;
    job.jobUrl = convertPureJobDetailUrl(jobHref);
    job.jobName = jobName;
    job.jobCompanyName = fullCompanyName;
    job.jobLocationName = jobAreaString;
    job.jobAddress = jobAreaString;
    job.jobLongitude = lon;
    job.jobLatitude = lat;
    job.jobDescription = jobDescribe;
    job.jobDegreeName = degreeString;
    if (workYearString.endsWith("无需经验")) {
      job.jobYear = 0;
    } else {
      let groups = workYearString.match(/(?<min>[0-9\.]*)/)?.groups;
      job.jobYear = groups.min;
    }
    job.jobSalaryMin = jobSalaryMin;
    job.jobSalaryMax = jobSalaryMax;
    if (provideSalaryString.endsWith("薪")) {
      let groups = provideSalaryString.match(SALARY_MATCH)?.groups;
      job.jobSalaryTotalMonth = groups.month;
    } else {
      job.jobSalaryTotalMonth = "";
    }
    job.jobFirstPublishDatetime = convertDateStringToDateObject(
      confirmDateString
    );
    job.bossName = hrName;
    job.bossCompanyName = fullCompanyName;
    job.bossPosition = hrPosition;
    jobs.push(job);
  }
  return jobs;
}

export async function saveCompany(source, platform) {
  infoLog("save company start,platform = " + platform);
  let company;
  if (PLATFORM_AIQICHA == platform) {
    company = handleAiqichaData(source);
  } else {
    throw "saveCompany not support platform " + platform;
  }
  await CompanyApi.addOrUpdateCompany(company);
  infoLog("save company success");
}

function handleAiqichaData(source) {
  let company = new Company();
  company.companyId = genSha256(companyNameConvert(source.entName)) + "";
  company.companyName = companyNameConvert(source.entName);
  company.companyDesc = source.describe;
  company.companyStartDate = convertDateStringToDateObject(source.startDate);
  company.companyStatus = source.openStatus;
  company.companyLegalPerson = source.legalPerson;
  company.companyUnifiedCode = source.unifiedCode;
  company.companyWebSite = source.website;
  company.companyInsuranceNum = source?.insuranceInfo?.insuranceNum;
  company.companySelfRisk = source.selfRiskTotal;
  company.companyUnionRisk = source.unionRiskTotal;
  company.companyAddress = source.addr;
  company.companyScope = source.scope;
  company.companyTaxNo = source.taxNo;
  company.companyIndustry = source.industry;
  company.companyLicenseNumber = source.licenseNumber;
  company.companyLongitude = source?.geoInfo?.lng;
  company.companyLatitude = source?.geoInfo?.lat;
  company.sourceUrl = source.sourceUrl;
  company.sourcePlatform = PLATFORM_AIQICHA;
  company.sourceRecordId = source.pid;
  company.sourceRefreshDatetime = convertDateStringToDateObject(
    source.refreshTime
  );
  return company;
}

export async function getCompanyFromCompanyInfo(companyInfo,convertedCompanyName) {
  let companyInfoDetail = await getCompanyInfoDetailByAiqicha(
    companyInfo.pid
  );
  let companyDetail = companyInfoDetail;
  companyDetail.selfRiskTotal = companyInfo?.risk?.selfRiskTotal;
  companyDetail.unionRiskTotal = companyInfo?.risk?.unionRiskTotal;
  companyDetail.sourceUrl = `https://aiqicha.baidu.com/company_detail_${companyDetail.pid}`;
  await saveCompany(companyDetail, PLATFORM_AIQICHA);
  let company = await CompanyApi.getCompanyById(
    genSha256(convertedCompanyName) + ""
  );
  return company;
}

async function getCompanyInfoDetailByAiqicha(pid) {
  const url = `https://aiqicha.baidu.com/company_detail_${pid}`;
  let abortFunctionHandler = null;
  const result = await httpFetchGetText(url, (abortFunction) => {
    abortFunctionHandler = abortFunction;
    //加入请求手动中断列表
    abortFunctionHandlerMap.set(abortFunctionHandler, null);
  });
  //请求正常结束，从手动中断列表中移除
  abortFunctionHandlerMap.delete(abortFunctionHandler);
  let data = JSON.parse(result.match(AIQICHA_PAGE_DATA_MATCH).groups["data"]);
  let companyInfoDetail = data.result;
  return companyInfoDetail;
}

export async function getCompanyInfoByAiqicha(keyword) {
  const decode = encodeURIComponent(keyword);
  const url = `https://aiqicha.baidu.com/s?q=${decode}`;
  let abortFunctionHandler = null;
  const result = await httpFetchGetText(url, (abortFunction) => {
    abortFunctionHandler = abortFunction;
    //加入请求手动中断列表
    abortFunctionHandlerMap.set(abortFunctionHandler, null);
  });
  //请求正常结束，从手动中断列表中移除
  abortFunctionHandlerMap.delete(abortFunctionHandler);
  let data = JSON.parse(result.match(AIQICHA_PAGE_DATA_MATCH).groups["data"]);
  let resultList = data.result.resultList;
  for (let i = 0; i < resultList.length; i++) {
    let companyInfo = resultList[i];
    if (isCompanyNameSame(companyInfo.titleName, keyword)) {
      return companyInfo;
    }
  }
  return null;
}

export async function saveOrUpdateCompanyTag(companyName, tags) {
  let companyId = genSha256(companyNameConvert(companyName)) + "";
  infoLog("save company tag");
  let companyTagBO = new CompanyTagBO();
  companyTagBO.id = companyId;
  companyTagBO.tags = tags;
  await CompanyApi.addOrUpdateCompanyTag(companyTagBO);
  infoLog("save company tag success");
}

/**
 * 转换公司名称，中文括号转为英文括号
 * @param {string} name
 * @returns
 */
export function companyNameConvert(name) {
  return name.replaceAll("（", "(").replaceAll("）", ")");
}

export function genSha256(value) {
  return sha256(value);
}

export function genCompanyIdWithSha256(value) {
  return genSha256("COMPANY_" + value);
}

export function genJobItemIdWithSha256(value) {
  return genSha256("JOBITEM_" + value);
}

/**
 * 公司名对比，将中文括号进行替换英文括号，然后进行对比
 * @param {*} name1
 * @param {*} name2
 * @returns
 */
function isCompanyNameSame(name1, name2) {
  return (
    name1.replaceAll("（", "(").replaceAll("）", ")") ==
    name2.replaceAll("（", "(").replaceAll("）", ")")
  );
}