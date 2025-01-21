import dayjs from "dayjs";
import { genIdFromText } from "../../common/utils";

export async function getMergeDataList(items, idColumn, getByIdsCallback, customAddRecordLogic) {
    let ids = items.flatMap(item => item[idColumn]);
    let existsRecordList = await getByIdsCallback(ids);
    let existsRecordIdAndObjectMap = new Map();
    for (let i = 0; i < existsRecordList.length; i++) {
        let existsRecord = existsRecordList[i];
        existsRecordIdAndObjectMap.set(existsRecord[idColumn], existsRecord);
    }
    let targetList = [];
    for (let i = 0; i < items.length; i++) {
        let newRecord = items[i];
        let existsRecord = existsRecordIdAndObjectMap.get(newRecord[idColumn]);
        if (existsRecord) {
            if (customAddRecordLogic) {
                let addItem = customAddRecordLogic(existsRecord, newRecord);
                if (addItem) {
                    targetList.push(addItem);
                }
            } else {
                if (dayjs(newRecord.createDatetime).isAfter(dayjs(existsRecord.createDatetime))) {
                    targetList.push(newRecord);
                } else {
                    //skip
                }
            }
        } else {
            targetList.push(newRecord);
        }
    }
    return targetList;
}

export async function getMergeDataListForCompany(items, idColumn, getByIdsCallback) {
    return await getMergeDataList(items, idColumn, getByIdsCallback, (existsRecord, newRecord) => {
        if (dayjs(newRecord.sourceRefreshDatetime).isAfter(dayjs(existsRecord.sourceRefreshDatetime))) {
            return newRecord;
        } else {
            //skip
        }
    });
}

export async function getMergeDataListForJob(items, idColumn, getByIdsCallback) {
    return await getMergeDataList(items, idColumn, getByIdsCallback, getValidJobData);
}

export const getValidJobData = (existsRecord, newRecord) => {
    let resultRecord = {};
    if (dayjs(newRecord.updateDatetime).isAfter(dayjs(existsRecord.updateDatetime))) {
        resultRecord = Object.assign(resultRecord, newRecord);
        if (dayjs(newRecord.createDatetime).isAfter(existsRecord.createDatetime)) {
            resultRecord.createDatetime = existsRecord.createDatetime;
        }
        //新纪录没有公司全称，则获取旧纪录的公司全称
        if (!newRecord.isFullCompanyName && existsRecord.isFullCompanyName) {
            resultRecord.jobCompanyName = existsRecord.jobCompanyName;
            resultRecord.isFullCompanyName = true;
        }
        return resultRecord;
    } else {
        resultRecord = Object.assign(resultRecord, existsRecord);
        //由于数据来源不够新，原则上不返回去更新，但是，如果首次扫描时间更久远，或有公司全称，则返回更新这两个字段的原数据
        let modify = false;
        if (dayjs(existsRecord.createDatetime).isAfter(newRecord.createDatetime)) {
            resultRecord.createDatetime = newRecord.createDatetime;
            modify = true;
        }
        //当前纪录没有公司全称，则获取进来的纪录的公司全称
        if (!existsRecord.isFullCompanyName && newRecord.isFullCompanyName) {
            resultRecord.jobCompanyName = newRecord.jobCompanyName;
            resultRecord.isFullCompanyName = true;
            modify = true;
        }
        if (modify) {
            return resultRecord;
        } else {
            return null;
        }
    }
}

export async function getMergeDataListForCompanyTag(items, getByIdsCallback) {
    let ids = items.flatMap(item => genIdFromText(item.companyName));
    let targetList = [];
    let existsRecordList = await getByIdsCallback(ids);
    let companyAndTagArrayMap = new Map();
    for (let i = 0; i < existsRecordList.length; i++) {
        let existsRecord = existsRecordList[i];
        let name = existsRecord.companyName;
        if (!companyAndTagArrayMap.has(name)) {
            companyAndTagArrayMap.set(name, []);
        }
        companyAndTagArrayMap.get(name).push(existsRecord.tagName);
    }
    for (let i = 0; i < items.length; i++) {
        let item = items[i]
        let companyName = item.companyName;
        if (companyAndTagArrayMap.has(companyName)) {
            let tags = item.tags;
            let existsTags = companyAndTagArrayMap.get(companyName);
            let existsTagsMap = new Map();
            for (let n = 0; n < existsTags.length; n++) {
                existsTagsMap.set(existsTags[n], null);
            }
            let targetTags = [];
            targetTags.push(...existsTags);
            for (let n = 0; n < tags.length; n++) {
                let tag = tags[n];
                if (!existsTagsMap.has(tag)) {
                    targetTags.push(tag);
                }
            }
            item.tags = targetTags;
        }
        targetList.push(item);
    }
    return targetList;
}

export async function getMergeDataListForTag(items, idColumn, getByIdsCallback) {
    return await getMergeDataList(items, idColumn, getByIdsCallback, (existsRecord, newRecord) => {
        if (dayjs(newRecord.updateDatetime).isAfter(dayjs(existsRecord.updateDatetime))) {
            return newRecord;
        } else {
            //skip
        }
    });
}
