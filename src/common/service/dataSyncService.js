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
    return await getMergeDataList(items, idColumn, getByIdsCallback, (existsRecord, newRecord) => {
        if (dayjs(newRecord.createDatetime).isAfter(dayjs(existsRecord.createDatetime))) {
            if (!newRecord.isFullCompanyName && existsRecord.isFullCompanyName) {
                newRecord.jobCompanyName = existsRecord.jobCompanyName;
                newRecord.isFullCompanyName = 1;
            }
            return newRecord;
        } else {
            if (!existsRecord.isFullCompanyName && newRecord.isFullCompanyName) {
                existsRecord.jobCompanyName = newRecord.jobCompanyName;
                existsRecord.isFullCompanyName = 1;
                return existsRecord;
            } else {
                return null;
            }
        }
    });
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