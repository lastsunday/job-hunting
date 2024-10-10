import { Message } from "../../common/api/message";
import { postSuccessMessage, postErrorMessage } from "../util";
import { insert, update, one, del, search, searchCount,batchDel } from "../database";
import { MissionLog } from "../../common/data/domain/missionLog";
import { genUniqueId } from "../../common/utils";
import { SearchMissionLogBO } from "../../common/data/bo/searchMissionLogBO";
import { SearchMissionLogDTO } from "../../common/data/dto/searchMissionLogDTO";

const TABLE_NAME = "mission_log";
const TABLE_ID_COLUMN = "mission_log_id";

export const MissionLogService = {
    /**
     * 
     * @param {Message} message 
     * @param {SearchMissionLogBO} param 
     * 
     * @returns SearchMissionLogDTO
     */
    searchMissionLog: async function (message, param) {
        try {
            let result = new SearchMissionLogDTO();
            const whereConditionFunction = (param) => {
                let whereCondition = "";
                if (param.missionId) {
                    whereCondition += ` AND mission_id = '${param.missionId}' `;
                }
                return whereCondition;
            };
            result.items = await search(new MissionLog(), TABLE_NAME, param, whereConditionFunction);
            result.total = await searchCount(new MissionLog(), TABLE_NAME, param, whereConditionFunction);
            postSuccessMessage(message, result);
        } catch (e) {
            postErrorMessage(message, "[worker] searchCompanyTag error : " + e.message);
        }
    },
    /**
     *
     * @param {Message} message
     * @param {MissionLog} param
     */
    missionLogAddOrUpdate: async function (message, param) {
        try {
            await _addOrUpdate(param);
            postSuccessMessage(message, {});
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] missionLogAddOrUpdate error : " + e.message
            );
        }
    },
    /**
     *
     * @param {Message} message
     * @param {string} param id
     */
    missionLogDeleteById: async function (message, param) {
        try {
            await del(TABLE_NAME, TABLE_ID_COLUMN, param);
            postSuccessMessage(message, {});
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] missionLogDeleteById error : " + e.message
            );
        }
    },
    /**
     *
     * @param {Message} message
     * @param {string[]} param ids
     */
    missionLogDeleteByIds: async function (message, param) {
        try {
            await batchDel(TABLE_NAME, TABLE_ID_COLUMN, param);
            postSuccessMessage(message, {});
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] missionLogDeleteByIds error : " + e.message
            );
        }
    },
};

/**
 * 
 * @param {MissionLog} param 
 */
export async function _addOrUpdate(param) {
    let needUpdate = false;
    if (param.missionLogId) {
        needUpdate = (await one(new MissionLog(), TABLE_NAME, TABLE_ID_COLUMN, param.missionLogId) ? true : false);
    } else {
        needUpdate = false;
    }
    if (needUpdate) {
        return update(new MissionLog(), TABLE_NAME, TABLE_ID_COLUMN, param);
    } else {
        param.missionLogId = genUniqueId();
        return insert(new MissionLog(), TABLE_NAME, param);
    }
}
