import { Message } from "@/common/api/message";
import { JobSnapshotBatchAddOrUpdateBO } from "@/common/data/bo/jobSnapshotBatchAddOrUpdateBO";
import { JobSnapshotSearchBO } from "@/common/data/bo/jobSnapshotSearchBO";
import { JobSnapshot } from "@/common/data/domain/jobSnapshot";
import { postErrorMessage, postSuccessMessage } from "@/common/extension/worker/util";
import dayjs from "dayjs";
import { getDb } from "../database";
import { BaseService } from "../service/baseService";
const TABLE_NAME = "job_snapshot";
const TABLE_ID_COLUMN = "id";

const SERVICE_INSTANCE = new BaseService(TABLE_NAME, TABLE_ID_COLUMN,
    () => {
        return new JobSnapshot();
    },
    () => {
        return new JobSnapshotSearchBO();
    },
    (param) => {
        let whereCondition = "";
        if (param.ids && param.ids.length > 0) {
            const arraySplitString = "'" + param.ids.join("','") + "'";
            whereCondition +=
                ` AND id IN (${arraySplitString})`;
        }
        if (param.jobIds && param.jobIds.length > 0) {
            const arraySplitString = "'" + param.jobIds.join("','") + "'";
            whereCondition +=
                ` AND job_id IN (${arraySplitString})`;
        }
        if (param.startDatetimeForCreate) {
            whereCondition +=
                " AND create_datetime >= '" +
                dayjs(param.startDatetimeForCreate).format() +
                "'";
        }
        if (param.endDatetimeForCreate) {
            whereCondition +=
                " AND create_datetime < '" +
                dayjs(param.endDatetimeForCreate).format() +
                "'";
        }
        if (param.startDatetimeForUpdate) {
            whereCondition +=
                " AND update_datetime >= '" +
                dayjs(param.startDatetimeForUpdate).format() +
                "'";
        }
        if (param.endDatetimeForUpdate) {
            whereCondition +=
                " AND update_datetime < '" +
                dayjs(param.endDatetimeForUpdate).format() +
                "'";
        }
        return whereCondition;
    }
);

export const JobSnapshotService = {
    /**
     * 
     * @param {Message} message 
     * @param {JobSnapshotSearchBO} param 
     * 
     * @returns JobSnapshotSearchDTO
     */
    jobSnapshotSearch: async function (message, param) {
        SERVICE_INSTANCE.search(message, param, {
            entityClassCreateFunction: () => {
                const obj = new JobSnapshot();
                if (param.skipContent) {
                    delete obj.content;
                }
                return obj;
            }
        });
    },
    /**
     *
     * @param {Message} message
     * @param {JobSnapshot} param
     */
    jobSnapshotAddOrUpdate: async function (message, param) {
        try {
            await SERVICE_INSTANCE._addOrUpdate(param);
            postSuccessMessage(message, {});
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] jobSnapshotAddOrUpdate error : " + e.message
            );
        }
    },
    /**
     * 
     * @param {Message} message 
     * @param {JobSnapshotBatchAddOrUpdateBO} param 
     */
    jobSnapshotBatchAddOrUpdate: async function (message, param) {
        try {
            await (await getDb()).transaction(async (tx) => {
                await SERVICE_INSTANCE._batchAddOrUpdate(param.items, { overrideUpdateDatetime: param.overrideUpdateDatetime, connection: tx })
            });
            postSuccessMessage(message, {});
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] jobSnapshotBatchAddOrUpdate error : " + e.message
            );
        }
    },
    /**
     *
     * @param {Message} message
     * @param {string[]} param ids
     */
    jobSnapshotGetByIds: async function (message, param) {
        SERVICE_INSTANCE.getByIds(message, param);
    },
    /**
     *
     * @param {Message} message
     * @param {string} param id
     */
    jobSnapshotGetById: async function (message, param) {
        SERVICE_INSTANCE.getById(message, param);
    },
    /**
     *
     * @param {Message} message
     * @param {string} param id
     */
    jobSnapshotDeleteById: async function (message, param) {
        SERVICE_INSTANCE.deleteById(message, param);
    },
    /**
     *
     * @param {Message} message
     * @param {string[]} param ids
     */
    jobSnapshotDeleteByIds: async function (message, param) {
        SERVICE_INSTANCE.deleteByIds(message, param);
    },
};

