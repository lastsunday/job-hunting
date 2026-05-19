import sha256 from "crypto-js/sha256";
import dayjs from "dayjs";
import {
  PLATFORM_51JOB,
  PLATFORM_AIQICHA,
  PLATFORM_BOSS,
  PLATFORM_JOBSDB,
  PLATFORM_LAGOU,
  PLATFORM_LIEPIN,
  PLATFORM_ZHILIAN,
  PLATFORM_JOBONLINE,
  PLATFORM_GGFW_HRSS_GD,
  TAG_SOURCE_TYPE_PLATFORM,
  genId,
} from "../../common";
import { CompanyApi, JobApi, ConfigApi } from "../../common/api";
import { httpFetchGetText } from "../../common/api/common";
import { CompanyTagBO } from "../../common/data/bo/companyTagBO";
import { Company } from "../../common/data/domain/company";
import { Job } from "../../common/data/domain/job";
import { infoLog } from "../../common/log";
import {
  convertDateStringToDateObject,
  convertPureJobDetailUrl,
  isNotEmpty
} from "../../common/utils";
import {
  JOB_STATUS_DESC_NEWEST,
} from "./common";
import { AnalysisConfigDTO } from "../../common/data/dto/analysisConfigDTO";
import { CONFIG_KEY_ANALYSIS } from "../../common/config";
import { useCompany } from "../../common/hooks/company";
const { convertCapitalValueFromString } = useCompany();

const SALARY_MATCH = /(?<min>[0-9\.]*)(?<minUnit>\D*)(?<max>[0-9\.]*)(?<maxUnit>\D*)(?<month>\d*)/;
const JOB_YEAR_MATCH = /(?<min>[0-9\.]*)\D*(?<max>[0-9\.]*)/;
const AIQICHA_PAGE_DATA_MATCH = /window.pageData = (?<data>\{.*\})/;

import { bd09ToWgs84, gcj02ToWgs84 } from '@pansy/lnglat-transform';

//请求中断列表
const abortFunctionHandlerMap = new Map();

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
  } else if (PLATFORM_JOBONLINE == platform) {
    jobs = handleJobOnline(list);
  } else if (PLATFORM_GGFW_HRSS_GD == platform) {
    jobs = handleGgfwHrssGd(list);
  } else {
    //skip
  }
  //convert company name
  if (jobs) {
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      job.jobCompanyName = companyNameConvert(job.jobCompanyName);
    }
  }
  await JobApi.batchAddOrUpdateJobBrowse(jobs);
  infoLog("saveBrowseJob success,record size = " + list.length);
}

export function getJobIds(list, platform) {
  const result = [];
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    let jobId;
    if (PLATFORM_51JOB == platform) {
      jobId = item.jobId;
    } else if (PLATFORM_BOSS == platform) {
      jobId = item.encryptJobId ?? item.encryptId;
    } else if (PLATFORM_ZHILIAN == platform) {
      jobId = item.jobId;
    } else if (PLATFORM_LAGOU == platform) {
      jobId = item.positionId;
    } else if (PLATFORM_JOBSDB == platform) {
      jobId = item.id;
    } else if (PLATFORM_LIEPIN == platform) {
      jobId = item.job.jobId;
    } else if (PLATFORM_JOBONLINE == platform) {
      jobId = item.id;
    } else if (PLATFORM_GGFW_HRSS_GD == platform) {
      jobId = item.bcb009;
    } else {
      //skip
    }
    result.push(genId(jobId, platform));
  }
  return result;
}

function handleGgfwHrssGd(list) {
  const jobs = [];
  for (let i = 0; i < list.length; i++) {
    const job = new Job();
    const item = list[i];
    const {
      bcb009: id,
      bce055: jobName,
      aab004: companyName,
      acb204Name: cityName,
      acc530: address,
      aac011Name: eduDegree,
      aae162Name: jobAge,
      bdb286: publishTime,
      acb241: lowSalaryOrigin,
      acb242: highSalaryOrigin,
      acb22a: description,
      bcb034: longitude,
      bcb035: latitude,
      bcb182Name: welfare,
    } = item;
    job.jobId = genId(id, PLATFORM_GGFW_HRSS_GD);
    job.jobPlatform = PLATFORM_GGFW_HRSS_GD;
    job.jobUrl = `https://ggfw.hrss.gd.gov.cn/recruitment/internet/main/#/positionDetail?bcb009=${id}`;
    job.jobName = jobName;
    job.jobCompanyName = companyName;
    job.jobLocationName = cityName;
    job.jobAddress = address;
    job.jobLongitude = longitude;
    job.jobLatitude = latitude;
    if (job.jobLongitude && job.jobLatitude) {
      const wgs84 = bd09ToWgs84(job.jobLongitude, job.jobLatitude);
      job.jobLongitude = wgs84[0];
      job.jobLatitude = wgs84[1];
    }
    job.jobDescription = description;
    job.jobDegreeName = eduDegree;
    if (jobAge) {
      if (jobAge == '经验不限') {
        job.jobYear = 0;
      } else {
        const groups = jobAge.match(/(?<min>[0-9\.]*)/)?.groups;
        job.jobYear = groups.min;
      }
    }
    job.jobSalaryMin = lowSalaryOrigin > 0 ? lowSalaryOrigin : null;
    job.jobSalaryMax = highSalaryOrigin > 0 ? highSalaryOrigin : null;
    job.jobSalaryTotalMonth = '';
    job.jobFirstPublishDatetime = dayjs(publishTime);
    job.bossName = '';
    job.bossCompanyName = companyName;
    job.bossPosition = '';
    job.isFullCompanyName = true;
    job.welfareTag = welfare;
    job.skillTag = '';
    jobs.push(job);
  }
  return jobs;
}

function handleJobOnline(list) {
  const jobs = [];
  for (let i = 0; i < list.length; i++) {
    const job = new Job();
    const item = list[i];
    const {
      id,
      positionName,
      companyName,
      cityName,
      address,
      eduDegree,
      jobAge,
      months,
      publishTime,
      lowSalaryOrigin,
      highSalaryOrigin,
      description,
      location,
      light,
    } = item;
    job.jobId = genId(id, PLATFORM_JOBONLINE);
    job.jobPlatform = PLATFORM_JOBONLINE;
    job.jobUrl = `https://www.jobonline.cn/positionDetail?id=${id}`;
    job.jobName = positionName;
    job.jobCompanyName = companyName;
    job.jobLocationName = cityName;
    job.jobAddress = address;
    const locationArray = location.split(",");
    job.jobLongitude = locationArray[0];
    job.jobLatitude = locationArray[1];
    if (job.jobLongitude && job.jobLatitude) {
      const wgs84 = bd09ToWgs84(job.jobLongitude, job.jobLatitude);
      job.jobLongitude = wgs84[0];
      job.jobLatitude = wgs84[1];
    }
    job.jobDescription = description;
    job.jobDegreeName = eduDegree;
    if (jobAge) {
      if (jobAge == '经验不限') {
        job.jobYear = 0;
      } else {
        const groups = jobAge.match(/(?<min>[0-9\.]*)/)?.groups;
        job.jobYear = groups.min;
      }
    }
    job.jobSalaryMin = lowSalaryOrigin > 0 ? lowSalaryOrigin : null;
    job.jobSalaryMax = highSalaryOrigin > 0 ? highSalaryOrigin : null;
    job.jobSalaryTotalMonth = months;
    job.jobFirstPublishDatetime = dayjs.unix(publishTime);
    job.bossName = '';
    job.bossCompanyName = companyName;
    job.bossPosition = '';
    job.isFullCompanyName = true;
    job.welfareTag = light && light.length > 0 ? light.map(item => item.replaceAll("。", "").replaceAll("；", "").replaceAll(" ", ",").replaceAll("，", ",").split(",").join(",")).join(",") : null;
    job.skillTag = '';
    jobs.push(job);
  }
  return jobs;
}

function handleLiepin(list) {
  const jobs = [];
  for (let i = 0; i < list.length; i++) {
    const job = new Job();
    const item = list[i];
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
    const jobYearGroups = requireWorkYears?.match(JOB_YEAR_MATCH)?.groups;
    if (jobYearGroups) {
      job.jobYear = jobYearGroups.min;
    } else {
      //skip
    }
    //handle salary
    //TODO salary content was complex,not handle all situation
    if (salary) {
      const targetSalary = salary.replaceAll(",", "").replaceAll("$", "");
      const groups = targetSalary.match(SALARY_MATCH)?.groups;
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
      const groups = salary.match(SALARY_MATCH)?.groups;
      job.jobSalaryTotalMonth = groups.month;
    } else {
      job.jobSalaryTotalMonth = "";
    }
    //暂未找到首次发布时间，用更新时间代替
    job.jobFirstPublishDatetime = convertDateStringToDateObject(refreshTime);
    job.bossName = recruiterName;
    job.bossCompanyName = compName;
    job.bossPosition = recruiterTitle;
    job.isFullCompanyName = false;
    jobs.push(job);
  }
  return jobs;
}

function handleJobsdb(list) {
  const jobs = [];
  for (let i = 0; i < list.length; i++) {
    const job = new Job();
    const item = list[i];
    const { id, jobUrl, title, jobDetail, listingDate, salaryLabel: salary } = item;
    const { description: companyFullName } = item.advertiser;
    const { countryCode: city, label: positionAddress } = item.locations;
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
    const targetSalary = salary.replaceAll(",", "").replaceAll("$", "");
    const groups = targetSalary.match(SALARY_MATCH)?.groups;
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
    job.isFullCompanyName = true;
    jobs.push(job);
  }
  return jobs;
}

function handleLagouData(list) {
  const jobs = [];
  for (let i = 0; i < list.length; i++) {
    const job = new Job();
    const item = list[i];
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
      positionLables,
      companyLabelList,
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
    if (job.jobLongitude && job.jobLatitude) {
      const wgs84 = gcj02ToWgs84(Number.parseFloat(job.jobLongitude), Number.parseFloat(job.jobLatitude));
      job.jobLongitude = wgs84[0];
      job.jobLatitude = wgs84[1];
    }
    job.jobDescription = positionDetail;
    job.jobDegreeName = education;
    //handle job year
    const jobYearGroups = workYear.match(JOB_YEAR_MATCH)?.groups;
    if (jobYearGroups) {
      job.jobYear = jobYearGroups.min;
    } else {
      //skip
    }
    //handle salary
    const groups = salary.match(SALARY_MATCH)?.groups;
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
    job.isFullCompanyName = true;
    job.skillTag = positionLables.length > 0 ? positionLables.join(",") : null;
    job.welfareTag = companyLabelList.length > 0 ? companyLabelList.join(",") : null;
    jobs.push(job);
  }
  return jobs;
}

function handleZhilianData(list) {
  const jobs = [];
  for (let i = 0; i < list.length; i++) {
    const job = new Job();
    const item = list[i];
    const {
      jobId,
      positionUrl,
      name,
      companyName,
      workCity,
      education,
      workingExp,
      salaryReal,
      publishTime,
      salaryCount,
      skillLabel,
      welfareLabel,
    } = item;
    const { workAddress, latitude, longitude } = item.jobDetailData.position.workLocation;
    const { description } = item.jobDetailData.position.desc;
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
    job.jobAddress = workAddress;
    job.jobLongitude = longitude;
    job.jobLatitude = latitude;
    if (job.jobLongitude && job.jobLatitude) {
      const wgs84 = gcj02ToWgs84(Number.parseFloat(job.jobLongitude), Number.parseFloat(job.jobLatitude));
      job.jobLongitude = wgs84[0];
      job.jobLatitude = wgs84[1];
    }
    job.jobDescription = description;
    job.jobDegreeName = education;
    //handle job year
    const jobYearGroups = workingExp.match(JOB_YEAR_MATCH)?.groups;
    if (jobYearGroups) {
      job.jobYear = jobYearGroups.min;
    } else {
      //skip
    }
    //handle salary
    const groups = salaryReal.match(SALARY_MATCH)?.groups;
    if (groups) {
      job.jobSalaryMin = Number.parseInt(groups?.min);
      job.jobSalaryMax = Number.parseInt(groups?.max);
    } else {
      //skip
    }
    //handle salary month
    const groupsSalaryCount = salaryCount.match(/(?<count>\d*)/)?.groups;
    job.jobSalaryTotalMonth = groupsSalaryCount.count;
    job.jobFirstPublishDatetime = convertDateStringToDateObject(
      publishTime
    );
    job.bossName = staffName;
    job.bossCompanyName = companyName;
    job.bossPosition = hrJob;
    job.isFullCompanyName = true;
    job.skillTag = skillLabel.length > 0 ? skillLabel.map(item => item.value).join(",") : null;
    job.welfareTag = welfareLabel.length > 0 ? welfareLabel.join(",") : null;
    jobs.push(job);
  }
  return jobs;
}

function handleBossData(list) {
  const jobs = [];
  for (let i = 0; i < list.length; i++) {
    const job = new Job();
    const item = list[i];
    const { encryptJobId, jobUrl, jobName,
      brandName, cityName, areaDistrict, businessDistrict, address,
      postDescription, jobDegree, jobExperience,
      salaryDesc, bossName, bossTitle, skills, welfareList
    } = item;
    const {
      latitude, longitude
    } = item.gps || {};
    job.jobId = genId(encryptJobId, PLATFORM_BOSS);
    job.jobPlatform = PLATFORM_BOSS;
    job.jobUrl = convertPureJobDetailUrl(jobUrl);
    job.jobName = jobName;
    job.jobCompanyName = brandName;
    job.jobLocationName = `${cityName}·${areaDistrict}·${businessDistrict}`;
    job.jobAddress = address;
    job.jobLongitude = longitude;
    job.jobLatitude = latitude;
    if (job.jobLongitude && job.jobLatitude) {
      const wgs84 = gcj02ToWgs84(job.jobLongitude, job.jobLatitude);
      job.jobLongitude = wgs84[0];
      job.jobLatitude = wgs84[1];
    }
    job.jobDescription = postDescription;
    job.jobDegreeName = jobDegree;
    //handle job year
    const jobYearGroups = jobExperience.match(JOB_YEAR_MATCH)?.groups;
    if (jobYearGroups) {
      job.jobYear = jobYearGroups.min;
    } else {
      //skip
    }
    //handle salary
    const groups = salaryDesc.match(SALARY_MATCH)?.groups;
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
    //TODO 暂不能获取职位招聘状态，因为detail.json接口限流窗口过小
    const jobStatusDesc = null;
    if (jobStatusDesc == JOB_STATUS_DESC_NEWEST.key) {
      //招聘状态为最新，则代表一周内发布的职位。记录入库的时间设置取今天零点。
      job.jobFirstPublishDatetime = dayjs(new Date()).startOf("day").toDate();
    } else {
      job.jobFirstPublishDatetime = null;
    }
    job.bossName = bossName;
    job.bossCompanyName = brandName;
    job.bossPosition = bossTitle;
    job.isFullCompanyName = false;
    job.skillTag = skills.length > 0 ? skills.filter(item => isNotEmpty(item)).join(",") : null;
    job.welfareTag = welfareList.length > 0 ? welfareList.filter(item => isNotEmpty(item)).join(",") : null;
    jobs.push(job);
  }
  return jobs;
}

function handle51JobData(list) {
  const jobs = [];
  for (let i = 0; i < list.length; i++) {
    const job = new Job();
    const item = list[i];
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
      jobWelfareCodeDataList,
      jobTagsList,
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
    if (job.jobLongitude && job.jobLatitude) {
      const wgs84 = bd09ToWgs84(job.jobLongitude, job.jobLatitude);
      job.jobLongitude = wgs84[0];
      job.jobLatitude = wgs84[1];
    }
    job.jobDescription = jobDescribe;
    job.jobDegreeName = degreeString;
    if (workYearString.endsWith("无需经验")) {
      job.jobYear = 0;
    } else {
      const groups = workYearString.match(/(?<min>[0-9\.]*)/)?.groups;
      job.jobYear = groups.min;
    }
    job.jobSalaryMin = jobSalaryMin;
    job.jobSalaryMax = jobSalaryMax;
    if (provideSalaryString.endsWith("薪")) {
      const groups = provideSalaryString.match(SALARY_MATCH)?.groups;
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
    job.isFullCompanyName = true;
    job.welfareTag = jobWelfareCodeDataList.length > 0 ? jobWelfareCodeDataList.map(item => item.chineseTitle).join(",") : null;
    job.skillTag = jobTagsList.length > 0 ? jobTagsList.map(item => item.jobTagName).filter(item => job.welfareTag ? (!job.welfareTag.includes(item)) : true).join(",") : null;
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
  const company = new Company();
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
  //原始数据为百度坐标
  if (company.companyLongitude && company.companyLatitude) {
    //TODO 转换后仍有偏移
    const wgs84 = bd09ToWgs84(company.companyLongitude, company.companyLatitude);
    company.companyLongitude = wgs84[0];
    company.companyLatitude = wgs84[1];
  }
  const { value: regCapitalValue, currency: regCapitalCurrency } = convertCapitalValueFromString(source.regCapital);
  company.regCapitalValue = regCapitalValue;
  company.regCapitalCurrency = regCapitalCurrency;
  //TODO 当前调用的https://aiqicha.baidu.com/company_detail_[pid]页面信息里，实缴资本获取不到，需要调用https://aiqicha.baidu.com/detail/basicAllDataAjax?pid=[pid]，但是该接口做了接口调用验证的限制。
  // const { value: paidinCapitalValue, currency: paidinCapitalCurrency } = convertCapitalValueFromString(source.paidinCapital);
  // company.paidinCapitalValue = paidinCapitalValue;
  // company.paidinCapitalCurrency = paidinCapitalCurrency;
  company.paidinCapitalValue = null;
  company.paidinCapitalCurrency = null;
  company.sourceUrl = source.sourceUrl;
  company.sourcePlatform = PLATFORM_AIQICHA;
  company.sourceRecordId = source.pid;
  company.sourceRefreshDatetime = convertDateStringToDateObject(
    source.refreshTime
  );
  return company;
}

export async function getCompanyFromCompanyInfo(companyInfo, convertedCompanyName) {
  const companyInfoDetail = await getCompanyInfoDetailByAiqicha(
    companyInfo.pid
  );
  const companyDetail = companyInfoDetail;
  companyDetail.selfRiskTotal = companyInfo?.risk?.selfRiskTotal;
  companyDetail.unionRiskTotal = companyInfo?.risk?.unionRiskTotal;
  companyDetail.sourceUrl = `https://aiqicha.baidu.com/company_detail_${companyDetail.pid}`;
  await saveCompany(companyDetail, PLATFORM_AIQICHA);
  const company = await CompanyApi.getCompanyById(
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
  const data = JSON.parse(result.match(AIQICHA_PAGE_DATA_MATCH).groups["data"]);
  const companyInfoDetail = data.result;
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
  const data = JSON.parse(result.match(AIQICHA_PAGE_DATA_MATCH).groups["data"]);
  const resultList = data.result.resultList;
  for (let i = 0; i < resultList.length; i++) {
    const companyInfo = resultList[i];
    if (isCompanyNameSame(companyInfo.titleName, keyword)) {
      return companyInfo;
    }
  }
  return null;
}

export async function addCompanyTagNotExists(companyName, tags, platform) {
  let addResult = false;
  const companyId = genSha256(companyNameConvert(companyName)) + "";
  const currentCompanyTagList = await CompanyApi.getAllCompanyTagDTOByCompanyId(companyId);
  let currentCompanyTagListCount = 0;
  const targetTagsArray = [];
  const currentTagsMap = new Map();
  if (currentCompanyTagList && currentCompanyTagList.length > 0) {
    currentCompanyTagListCount = currentCompanyTagList.length;
    const tagArray = currentCompanyTagList.flatMap(item => item.tagName);
    tagArray.forEach(item => {
      currentTagsMap.set(item, null);
    });
    targetTagsArray.push(...tagArray);
  }
  tags.forEach(item => {
    if (!currentTagsMap.has(item)) {
      currentTagsMap.set(item, null);
      targetTagsArray.push(item);
    }
  })
  if (targetTagsArray.length > currentCompanyTagListCount) {
    infoLog("addCompanyTagNotExists");
    const companyTagBO = new CompanyTagBO();
    companyTagBO.companyName = companyName;
    companyTagBO.tags = targetTagsArray;
    companyTagBO.sourceType = TAG_SOURCE_TYPE_PLATFORM;
    companyTagBO.source = platform;
    await CompanyApi.addOrUpdateCompanyTag(companyTagBO);
    infoLog("addCompanyTagNotExists success");
    addResult = true;
  } else {
    infoLog("skip addCompanyTagNotExists");
  }
  return addResult;
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

export const getAnalysisConfig = async () => {
  const configValue = await ConfigApi.getConfigByKey(CONFIG_KEY_ANALYSIS);
  if (configValue && configValue.value) {
    const config = JSON.parse(configValue.value);
    return Object.assign(new AnalysisConfigDTO(), config);
  } else {
    return new AnalysisConfigDTO();
  }
}
