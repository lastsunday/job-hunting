import {
    PLATFORM_51JOB,
    PLATFORM_BOSS,
    PLATFORM_JOBSDB,
    PLATFORM_LAGOU,
    PLATFORM_LIEPIN,
    PLATFORM_ZHILIAN,
    PLATFORM_JOBONLINE,
} from "@/common";

import dayjs from "dayjs";
import { Feature, FeatureCollection } from "geojson";
import { logo } from "../assets";
import { JobData } from "../data/JobData";

export function useJob() {

    const convertJobDataToGeojson = (items: JobData[]): FeatureCollection => {
        let features: Feature[] = [];
        items.forEach(item => {
            if (item.longitude != null && item.latitude != null) {
                features.push({
                    id: item.id,
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: [item.longitude, item.latitude],
                    },
                    properties: item,
                });
            }
        });
        let result: FeatureCollection = {
            type: "FeatureCollection",
            features: features,
        };
        return result;
    }

    const convertToJobDataList = (item: any[]): JobData[] => {
        let result = [];
        item.map((item) => {
            result.push(convertToJobData(item));
        });
        return result;
    };

    const convertToJobData = (item: any): JobData => {
        const {
            companyStatus,
            companyStartDate,
            companyIndustry,
            companyUnifiedCode,
            companyTaxNo,
            companyLicenseNumber,
            companyLegalPerson,
            companyWebSite,
            companyInsuranceNum,
            companySelfRisk,
            companyUnionRisk,
            companyAddress,
            companyLongitude,
            companyLatitude,
            companyDesc,
        } = item.companyDTO ?? {};

        return {
            id: item.jobId,
            name: item.jobName,
            url: item.jobUrl,
            salaryMin: item.jobSalaryMin,
            salaryMax: item.jobSalaryMax,
            salaryTotalMonth: item.jobSalaryTotalMonth,
            company: {
                name: item.jobCompanyName,
                companyTagList: item.companyTagDTOList,
                url: item.companyDTO?.sourceUrl,
                status: companyStatus,
                startDate: companyStartDate != null ? dayjs(companyStartDate).toDate() : null,
                industry: companyIndustry,
                unifiedCode: companyUnifiedCode,
                taxNo: companyTaxNo,
                licenseNumber: companyLicenseNumber,
                legalPerson: companyLegalPerson,
                webSite: companyWebSite,
                insuranceNum: companyInsuranceNum,
                selfRisk: companySelfRisk,
                unionRisk: companyUnionRisk,
                address: companyAddress,
                longitude: companyLongitude,
                latitude: companyLatitude,
                desc: companyDesc,
            },
            jobTagList: item.jobTagDTOList,
            location: item.jobLocationName,
            address: item.jobAddress,
            publishDatetime: item.jobFirstPublishDatetime,
            bossName: item.bossName,
            bossPosition: item.bossPosition,
            platform: item.jobPlatform,
            desc: item.jobDescription,
            degree: item.jobDegreeName,
            demandYear: item.jobYear,
            longitude: item.jobLongitude,
            latitude: item.jobLatitude,
            browseTime: item.latestBrowseDetailDatetime,
            createDatetime: item.createDatetime,
            browseCount: item.browseCount,
            browseDetailCount: item.browseDetailCount,
            skillTagList: item.skillTagList,
            welfareTagList: item.welfareTagList,
        };
    };

    const platformFormat = (value: string) => {
        switch (value) {
            case PLATFORM_BOSS:
                return "BOSS直聘";
            case PLATFORM_51JOB:
                return "前程无忧";
            case PLATFORM_LAGOU:
                return "拉钩网";
            case PLATFORM_LIEPIN:
                return "猎聘网";
            case PLATFORM_ZHILIAN:
                return "智联招聘";
            case PLATFORM_JOBONLINE:
                return "就业在线";
            default:
                return value;
        }
    };

    const platformLogo = (value: string) => {
        switch (value) {
            case PLATFORM_BOSS:
                return logo.boss;
            case PLATFORM_51JOB:
                return logo.job51;
            case PLATFORM_LAGOU:
                return logo.lagou;
            case PLATFORM_LIEPIN:
                return logo.liepin;
            case PLATFORM_ZHILIAN:
                return logo.zhilian;
            case PLATFORM_JOBSDB:
                return logo.jobsdb;
            case PLATFORM_JOBONLINE:
                return logo.jobonline;
            default:
                return "";
        }
    };

    const sortFieldMap = {
        "publishDatetime": "jobFirstPublishDatetime",
        "salaryMin": "jobSalaryMin",
        "salaryMax": "jobSalaryMax",
        "salaryTotalMonth": "jobSalaryTotalMonth",
        "degree": "jobDegreeName",
        "browseTime": "latestBrowseDetailDatetime",
        "createDatetime": "create_datetime",
        "browseCount": "browseDetailCount",
    }

    const convertSortField = (key: any) => {
        return sortFieldMap[key];
    }

    return { platformFormat, platformLogo, convertToJobDataList, convertToJobData, convertJobDataToGeojson, convertSortField }

}