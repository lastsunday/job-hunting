import { CompanyData } from "../data/CompanyData";

export function useCompany() {

    const convertToCompanyDataList = (items: any[]): CompanyData[] => {
        const result = [];
        items.map((item) => {
            result.push(convertToCompanyData(item));
        });
        return result;
    };

    const convertToCompanyData = (item: any): CompanyData => {
        const {
            companyId,
            companyName,
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
            sourceUrl,
            tagNameArray,
            sourcePlatform,
            sourceRecordId,
            sourceRefreshDatetime,
            createDatetime,
            updateDatetime,
            companyTagList,
            regCapitalValue,
            regCapitalCurrency,
        } = item ?? {};
        return {
            id: companyId,
            name: companyName,
            companyTagList,
            url: sourceUrl,
            status: companyStatus,
            startDate: companyStartDate,
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
            sourcePlatform,
            sourceRecordId,
            sourceRefreshDatetime,
            createDatetime,
            updateDatetime,
            regCapitalValue,
            regCapitalCurrency,
        }
    }

    const sortFieldMap = {
        "startDate": "company_start_date",
        "updateDatetime": "update_datetime",
    }

    const convertSortField = (key: any) => {
        return sortFieldMap[key];
    }

    return { convertToCompanyDataList, convertToCompanyData, convertSortField }
}