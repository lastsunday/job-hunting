import { Message } from "../../common/api/message";
import { postSuccessMessage, postErrorMessage } from "../util";
import { getAll, beginTransaction, commitTransaction, rollbackTransaction } from "../database";
import { genUniqueId, genIdFromText } from "../../common/utils";
import { Tag } from "../../common/data/domain/tag";
import { _addOrUpdateTag } from "./tagService";
import { JobTagDTO } from "../../common/data/dto/jobTagDTO";
import { BaseService } from "./baseService";
import { JobTag } from "../../common/data/domain/jobTag";
import { JobTagBO } from "../../common/data/bo/jobTagBO";

const JOB_ID_COLUMN = "job_id";

const SERVICE_INSTANCE = new BaseService("job_tag", "id",
    () => {
        return new JobTag();
    },
    null,
    null
);

export const JobTagService = {
    /**
     *
     * @param {Message} message
     * @param {string} param id
     *
     * @returns JobTag
     */
    getJobTagById: async function (message, param) {
        SERVICE_INSTANCE.getById(message, param);
    },
    /**
     *
     * @param {Message} message
     * @param {string} param jobId
     */
    deleteJobTagByJobId: async function (message, param) {
        SERVICE_INSTANCE.deleteById(message, param, JOB_ID_COLUMN);
    },
    /**
     *
     * @param {Message} message
     * @param {string[]} param jobIds
     */
    deleteJobTagByJobIds: async function (message, param) {
        SERVICE_INSTANCE.deleteByIds(message, param, JOB_ID_COLUMN);
    },
    /**
     * 
     * @param {Message} message 
     * @param {JobTagBO} param 
     */
    jobTagAddOrUpdate: async function (message, param) {
        try {
            await beginTransaction()
            await _addOrUpdateJobTag(param);
            await commitTransaction();
            postSuccessMessage(message, {});
        } catch (e) {
            await rollbackTransaction();
            postErrorMessage(
                message,
                "[worker] jobTagAddOrUpdate error : " + e.message
            );
        }
    },
    /**
     * 
     * @param {Message} message 
     * @param {JobTagBO[]} param 
     */
    batchAddOrUpdateJobTag: async function (message, param) {
        try {
            for (let i = 0; i < param.length; i++) {
                await _addOrUpdateJobTag(param[i]);
            }
            postSuccessMessage(message, {});
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] batchAddOrUpdateJobTag error : " + e.message
            );
        }
    },
    /**
     * 
     * @param {Message} message 
     * @param {JobTagBO[]} param 
     */
    jobTagBatchAddOrUpdateWithTransaction: async function (message, param) {
        try {
            await beginTransaction()
            for (let i = 0; i < param.length; i++) {
                await _addOrUpdateJobTag(param[i]);
            }
            await commitTransaction();
            postSuccessMessage(message, {});
        } catch (e) {
            await rollbackTransaction();
            postErrorMessage(
                message,
                "[worker] batchAddOrUpdateJobTagWithTransaction error : " + e.message
            );
        }
    },
    /**
     *
     * @param {Message} message
     * @param {string} param jobId
     *
     * @returns JobTagDTO[]
     */
    jobTagGetAllDTOByJobId: async function (message, param) {
        try {
            postSuccessMessage(
                message,
                await _getAllJobTagDTOByJobId(param)
            );
        } catch (e) {
            postErrorMessage(message, "[worker] jobTagGetAllDTOByJobId error : " + e.message);
        }
    },
    /**
     *
     * @param {Message} message
     * @param {string[]} param ids
     *
     * @returns JobTagDTO[]
     */
    jobTagGetAllDTOByJobIds: async function (message, param) {
        try {
            postSuccessMessage(
                message,
                await _getAllJobTagDTOByJobIds(param)
            );
        } catch (e) {
            postErrorMessage(message, "[worker] jobTagGetAllDTOByJobIds error : " + e.message);
        }
    },
};

/**
 * 
 * @param {JobTagBO} param 
 */
async function _addOrUpdateJobTag(param) {
    for (let i = 0; i < param.tags.length; i++) {
        let tagName = param.tags[i];
        let id = genIdFromText(tagName);
        let tag = new Tag();
        tag.tagId = id;
        tag.tagName = tagName;
        await _addOrUpdateTag(tag);
    }
    let jobId = param.jobId;
    await SERVICE_INSTANCE._deleteById(param.jobId, JOB_ID_COLUMN);
    for (let i = 0; i < param.tags.length; i++) {
        let tagName = param.tags[i];
        let tagId = genIdFromText(tagName);
        let jobTag = new JobTag();
        jobTag.id = genUniqueId();
        jobTag.jobId = jobId;
        jobTag.tagId = tagId;
        jobTag.seq = i;
        await SERVICE_INSTANCE._addOrUpdate(jobTag);
    }
}

/**
 * 
 * @param {string} param id
 * 
 * @return JobTagDTO[]
 */
export async function _getAllJobTagDTOByJobId(param) {
    return getAll(SQL_SELECT_DTO_BY_JOB_ID, [param], new JobTagDTO());
}

/**
 * 
 * @param {string[]} param ids
 * 
 * @return JobTagDTO[]
 */
export async function _getAllJobTagDTOByJobIds(param) {
    let sql = genSqlSelectDTOByJobIds(param);
    return await getAll(sql, [], new JobTagDTO());
}

const SQL_SELECT_DTO_BY_JOB_ID = `
SELECT t1.id, t1.job_id, t1.tag_id, t2.tag_name,t1.seq ,t1.create_datetime, t1.update_datetime FROM job_tag AS t1  LEFT JOIN tag AS t2 ON t1.tag_id = t2.tag_id where job_id = ? ORDER BY t1.seq ASC;
`;

function genSqlSelectDTOByJobIds(ids) {
    let idsString = "'" + ids.join("','") + "'";
    return `
    SELECT t1.id, t1.job_id, t1.tag_id, t2.tag_name,t1.seq ,t1.create_datetime, t1.update_datetime FROM job_tag AS t1  LEFT JOIN tag AS t2 ON t1.tag_id = t2.tag_id where job_id in (${idsString}) ORDER BY t1.seq ASC;
    `;
}
