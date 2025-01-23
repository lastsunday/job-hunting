import { Message } from "@/common/api/message";
import { Mission } from "@/common/data/domain/mission";
import { postErrorMessage, postSuccessMessage } from "@/common/extension/worker/util";
import { all, getDb, sort } from "../database";
import { BaseService } from "../service/baseService";

const TABLE_NAME = "mission";
const TABLE_ID_COLUMN = "mission_id";

const SERVICE_INSTANCE = new BaseService(TABLE_NAME, TABLE_ID_COLUMN,
    () => {
        return new Mission();
    },
    () => {
        return {};
    },
    (param) => {
        let whereCondition = "";
        return whereCondition;
    }
);

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
            await SERVICE_INSTANCE._batchAddOrUpdate([param]);
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
            await SERVICE_INSTANCE._deleteById(param);
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
            await (await getDb()).transaction(async (tx) => {
                return await sort(TABLE_NAME, TABLE_ID_COLUMN, param, { connection: tx });
            });
            postSuccessMessage(message, {});
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] missionDeleteById error : " + e.message
            );
        }
    },
};
