import { Message } from "@/common/api/message";
import { SearchMissionLogBO } from "@/common/data/bo/searchMissionLogBO";
import { MissionLog } from "@/common/data/domain/missionLog";
import { postErrorMessage, postSuccessMessage } from "@/common/extension/worker/util";
import { BaseService } from "../service/baseService";

const TABLE_NAME = "mission_log";
const TABLE_ID_COLUMN = "mission_log_id";

const SERVICE_INSTANCE = new BaseService(TABLE_NAME, TABLE_ID_COLUMN,
    () => {
        return new MissionLog();
    },
    () => {
        return new SearchMissionLogBO();
    },
    (param) => {
        let whereCondition = "";
        if (param.missionId) {
            whereCondition += ` AND mission_id = '${param.missionId}' `;
        }
        return whereCondition;
    }
);

export const MissionLogService = {
    /**
     * 
     * @param {Message} message 
     * @param {SearchMissionLogBO} param 
     * 
     * @returns SearchMissionLogDTO
     */
    searchMissionLog: async function (message, param) {
        SERVICE_INSTANCE.search(message, param);
    },
    /**
     *
     * @param {Message} message
     * @param {MissionLog} param
     */
    missionLogAddOrUpdate: async function (message, param) {
        try {
            await SERVICE_INSTANCE._addOrUpdate(param);
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
        SERVICE_INSTANCE.deleteById(message, param);
    },
    /**
     *
     * @param {Message} message
     * @param {string[]} param ids
     */
    missionLogDeleteByIds: async function (message, param) {
        SERVICE_INSTANCE.deleteByIds(message, param);
    },
};

