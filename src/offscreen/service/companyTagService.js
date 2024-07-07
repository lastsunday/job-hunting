import { Message } from "../../common/api/message";
import { postSuccessMessage, postErrorMessage } from "../util";
import { getDb, getOne, getAll } from "../database";
import { convertEmptyStringToNull, genUniqueId, genIdFromText } from "../../common/utils";
import dayjs from "dayjs";
import { CompanyTag } from "../../common/data/domain/companyTag";
import { Tag } from "../../common/data/domain/tag";
import { _addOrUpdateTag } from "./tagService";
import { CompanyTagDTO } from "../../common/data/dto/companyTagDTO"

export const CompanyTagService = {
    /**
     *
     * @param {Message} message
     * @param {string} param id
     *
     * @returns CompanyTag
     */
    getCompanyTagById: async function (message, param) {
        try {
            postSuccessMessage(
                message,
                _getCompanyTagById(param)
            );
        } catch (e) {
            postErrorMessage(message, "[worker] getTagById error : " + e.message);
        }
    },
    /**
     *
     * @param {Message} message
     * @param {CompanyTag} param
     */
    addCompanyTag: async function (message, param) {
        try {
            await _addCompanyTag(param);
            postSuccessMessage(message, {});
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] addOrUpdateTag error : " + e.message
            );
        }
    },
    /**
     *
     * @param {Message} message
     * @param {string} param companyId
     */
    deleteCompanyTagByCompanyId: async function (message, param) {
        try {
            await _deleteCompanyTagByCompanyId(param);
            postSuccessMessage(message, {});
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] addOrUpdateTag error : " + e.message
            );
        }
    },
    /**
     * 
     * @param {Message} message 
     * @param {CompanyTagBO} param 
     */
    addOrUpdateCompanyTag: async function (message, param) {
        try {
            const now = new Date();
            (await getDb()).exec({
                sql: "BEGIN TRANSACTION",
            });
            for (let i = 0; i < param.tags.length; i++) {
                let tagName = param.tags[i];
                let id = genIdFromText(tagName);
                let tag = new Tag();
                tag.tagId = id;
                tag.tagName = tagName;
                await _addOrUpdateTag(tag);
            }
            let companyName = param.companyName;
            let companyId = genIdFromText(companyName);
            await _deleteCompanyTagByCompanyId(companyId);
            for (let i = 0; i < param.tags.length; i++) {
                let tagName = param.tags[i];
                let tagId = genIdFromText(tagName);
                let companyTag = new CompanyTag();
                companyTag.companyTagId = genUniqueId();
                companyTag.companyId = companyId;
                companyTag.companyName = companyName;
                companyTag.tagId = tagId;
                companyTag.seq = i;
                await _addCompanyTag(companyTag);
            }
            (await getDb()).exec({
                sql: "COMMIT",
            });
            postSuccessMessage(message, {});
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] addOrUpdateCompanyTag error : " + e.message
            );
        }
    },
    /**
     *
     * @param {Message} message
     * @param {string} param companyId
     *
     * @returns CompanyTagDTO[]
     */
    getAllCompanyTagDTOByCompanyId: async function (message, param) {
        try {
            postSuccessMessage(
                message,
                await _getAllCompanyTagDTOByCompanyId(param)
            );
        } catch (e) {
            postErrorMessage(message, "[worker] getTagById error : " + e.message);
        }
    },
};

/**
 * 
 * @param {string} param id
 */
export async function _getCompanyTagById(param) {
    return getOne(SQL_SELECT_BY_ID, [param], new Tag());
}

/**
 * 
 * @param {string} param id
 * 
 * @return CompanyTagDTO[]
 */
export async function _getAllCompanyTagDTOByCompanyId(param) {
    return getAll(SQL_SELECT_DTO_BY_COMPANY_ID, [param], new CompanyTagDTO());
}

/**
 * 
 * @param {CompanyTag} param 
 */
export async function _addCompanyTag(param) {
    const now = new Date();
    (await getDb()).exec({
        sql: SQL_INSERT,
        bind: {
            $company_tag_id: convertEmptyStringToNull(param.companyTagId),
            $company_id: convertEmptyStringToNull(param.companyId),
            $company_name: convertEmptyStringToNull(param.companyName),
            $tag_id: convertEmptyStringToNull(param.tagId),
            $seq: convertEmptyStringToNull(param.seq),
            $create_datetime: dayjs(now).format("YYYY-MM-DD HH:mm:ss"),
            $update_datetime: dayjs(now).format("YYYY-MM-DD HH:mm:ss"),
        },
    });
}

/**
 * 
 * @param {string} param companyId
 */
export async function _deleteCompanyTagByCompanyId(param) {
    (await getDb()).exec({
        sql: SQL_DELETE_BY_COMPANY_ID,
        bind: [param],
    });
}

const SQL_SELECT = `SELECT company_tag_id, company_id, company_name,tag_id,seq ,create_datetime, update_datetime FROM company_tag`;
const SQL_SELECT_BY_ID = `${SQL_SELECT} WHERE company_tag_id = ?`;
const SQL_INSERT = `
INSERT INTO company_tag (company_tag_id, company_id, company_name,tag_id,seq,create_datetime, update_datetime) VALUES ($company_tag_id, $company_id, $company_name,$tag_id,$seq ,$create_datetime, $update_datetime)
`;
const SQL_DELETE_BY_COMPANY_ID = `
DELETE FROM company_tag WHERE company_id = ?
`;

const SQL_SELECT_DTO_BY_COMPANY_ID = `
SELECT t1.company_tag_id, t1.company_id, t1.company_name,t1.tag_id, t2.tag_name,t1.seq ,t1.create_datetime, t1.update_datetime FROM company_tag AS t1  LEFT JOIN tag AS t2 ON t1.tag_id = t2.tag_id where company_id = ? ORDER BY t1.seq ASC;
`;