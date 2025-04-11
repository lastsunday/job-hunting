import { JobSnapshotApi } from "@/common/api";
import { JOB_SNAPSHOT_FULL_FETCH_OR_INSERT_MAX_BATCH_SIZE } from "@/common/config";

export function useJobSnapshot() {

    const getFullData = async (originData) => {
        const result = [];
        const ids = originData.map((item) => item.id);
        const totalBatches = Math.ceil(ids.length / JOB_SNAPSHOT_FULL_FETCH_OR_INSERT_MAX_BATCH_SIZE);
        for (let i = 0; i < totalBatches; i++) {
            const start = i * JOB_SNAPSHOT_FULL_FETCH_OR_INSERT_MAX_BATCH_SIZE;
            const end = Math.min(start + JOB_SNAPSHOT_FULL_FETCH_OR_INSERT_MAX_BATCH_SIZE, ids.length);
            const rangeIds = ids.slice(start, end);
            const items = await JobSnapshotApi.jobSnapshotGetByIds(rangeIds);
            result.push(...items);
        }
        return result;
    }

    return { getFullData }
}