import { Message } from "@/common/api/message";
import { JobSnapshotSearchBO } from "@/common/data/bo/jobSnapshotSearchBO";
import { JobSnapshot } from "@/common/data/domain/jobSnapshot";
import { postErrorMessage, postSuccessMessage } from "@/common/extension/worker/util";
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
        if (param.jobId) {
            whereCondition += ` AND job_id = '${param.jobId}' `;
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

