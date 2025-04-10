import { JobSnapshotData } from "../data/JobSnapshotData";

export function useJobSnapshot() {

    const convertToDataList = (items: any[]): JobSnapshotData[] => {
        const result = [];
        items.map((item) => {
            result.push(convertToData(item));
        });
        return result;
    };

    const convertToData = (item: any): JobSnapshotData => {
        const {
            id,
            jobId,
            url,
            content,
            platform,
            createDatetime,
            updateDatetime,
        } = item ?? {};

        return {
            id,
            jobId,
            url,
            content,
            platform,
            createDatetime,
            updateDatetime,
        }
    }

    const sortFieldMap = {
        "updateDatetime": "updateDatetime",
    }

    const convertSortField = (key: any) => {
        return sortFieldMap[key];
    }

    return { convertToDataList, convertToData, convertSortField }
}