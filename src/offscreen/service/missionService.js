import { Message } from "../../common/api/message";
import { postSuccessMessage, postErrorMessage } from "../util";
import { insert, update, one, all, del, sort } from "../database";
import { Mission } from "../../common/data/domain/mission";
import { genUniqueId } from "../../common/utils";

const TABLE_NAME = "mission";
const TABLE_ID_COLUMN = "mission_id";

export const MissionService = {
    /**
     *
     * @param {Message} message
     * @param {} param 
     *
     * @returns Mission[]
     */
    missionGetAll: async function (message, param) {
        try {
            let entity = new Mission();
            postSuccessMessage(
                message,
                await all(entity, TABLE_NAME, "seq ASC,update_datetime DESC")
            );
        } catch (e) {
            postErrorMessage(message, "[worker] missionGetAll error : " + e.message);
        }
    },
    /**
     *
     * @param {Message} message
     * @param {Mission} param
     */
    missionAddOrUpdate: async function (message, param) {
        try {
            await _addOrUpdate(param);
            postSuccessMessage(message, {});
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] missionAddOrUpdate error : " + e.message
            );
        }
    },
    /**
     *
     * @param {Message} message
     * @param {string} param
     */
    missionDeleteById: async function (message, param) {
        try {
            await del(TABLE_NAME, TABLE_ID_COLUMN, param);
            postSuccessMessage(message, {});
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] missionDeleteById error : " + e.message
            );
        }
    },
    /**
     *
     * @param {Message} message
     * @param {string[]} param ids
     */
    missionSort: async function (message, param) {
        try {
            await sort(TABLE_NAME, TABLE_ID_COLUMN, param);
            postSuccessMessage(message, {});
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] missionDeleteById error : " + e.message
            );
        }
    },
};

/**
 * 
 * @param {Mission} param 
 */
export async function _addOrUpdate(param) {
    let needUpdate = false;
    if (param.missionId) {
        needUpdate = (await one(new Mission(), TABLE_NAME, TABLE_ID_COLUMN, param.missionId) ? true : false);
    } else {
        needUpdate = false;
    }
    if (needUpdate) {
        return update(new Mission(), TABLE_NAME, TABLE_ID_COLUMN, param);
    } else {
        param.missionId = genUniqueId();
        return insert(new Mission(), TABLE_NAME, param);
    }
}
