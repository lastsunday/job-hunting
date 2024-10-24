import { Message } from "../../common/api/message";
import { postSuccessMessage, postErrorMessage } from "../util";
import { SearchDataSharePartnerBO } from "../../common/data/bo/searchDataSharePartnerBO";
import { SearchDataSharePartnerDTO } from "../../common/data/dto/searchDataSharePartnerDTO";
import { StatisticDataSharePartnerDTO } from "../../common/data/dto/statisticDataSharePartnerDTO";
import { BaseService } from "./baseService";
import { DataSharePartner } from "../../common/data/domain/dataSharePartner";
import { getDb } from "../database";
import dayjs from "dayjs";

export const SERVICE_INSTANCE = new BaseService("data_share_partner", "id",
    () => {
        return new DataSharePartner();
    },
    () => {
        return new SearchDataSharePartnerDTO();
    },
    (param) => {
        let whereCondition = "";
        if (param.username) {
            whereCondition +=
                ` AND username LIKE '%${param.username}%'`;
        }
        if (param.usernameList && param.usernameList.length > 0) {
            let arraySplitString = "'" + param.usernameList.join("','") + "'";
            whereCondition +=
                ` AND username IN (${arraySplitString})`;
        }
        if (param.startDatetimeForCreate) {
            whereCondition +=
                " AND create_datetime >= '" +
                dayjs(param.startDatetimeForCreate).format("YYYY-MM-DD HH:mm:ss") +
                "'";
        }
        if (param.endDatetimeForCreate) {
            whereCondition +=
                " AND create_datetime < '" +
                dayjs(param.endDatetimeForCreate).format("YYYY-MM-DD HH:mm:ss") +
                "'";
        }
        if (param.startDatetimeForUpdate) {
            whereCondition +=
                " AND update_datetime >= '" +
                dayjs(param.startDatetimeForUpdate).format("YYYY-MM-DD HH:mm:ss") +
                "'";
        }
        if (param.endDatetimeForUpdate) {
            whereCondition +=
                " AND update_datetime < '" +
                dayjs(param.endDatetimeForUpdate).format("YYYY-MM-DD HH:mm:ss") +
                "'";
        }
        return whereCondition;
    }
);

export const DataSharePartnerService = {
    /**
     * 
     * @param {Message} message 
     * @param {SearchDataSharePartnerBO} param 
     * 
     * @returns SearchDataSharePartnerDTO
     */
    searchDataSharePartner: async function (message, param) {
        SERVICE_INSTANCE.search(message, param);
    },
    /**
     *
     * @param {Message} message
     * @param {string} param id
     */
    dataSharePartnerGetById: async function (message, param) {
        SERVICE_INSTANCE.getById(message, param);
    },
    /**
     *
     * @param {Message} message
     * @param {DataSharePartner} param
     */
    dataSharePartnerAddOrUpdate: async function (message, param) {
        SERVICE_INSTANCE.addOrUpdate(message, param);
    },

    /**
     *
     * @param {Message} message
     * @param {DataSharePartner[]} param
     */
    dataSharePartnerBatchAddOrUpdate: async function (message, param) {
        try {
            (await getDb()).exec({
                sql: "BEGIN TRANSACTION",
            });
            for (let i = 0; i < param.length; i++) {
                const item = param[i];
                await SERVICE_INSTANCE._addOrUpdate(item);
            }
            (await getDb()).exec({
                sql: "COMMIT",
            });
            postSuccessMessage(message, param);
        } catch (e) {
            (await getDb()).exec({
                sql: "ROLLBACK TRANSACTION",
            });
            postErrorMessage(
                message,
                "[worker] dataSharePartnerBatchAddOrUpdate error : " + e.message
            );
        }
    },
    /**
     *
     * @param {Message} message
     * @param {string} param id
     */
    dataSharePartnerDeleteById: async function (message, param) {
        SERVICE_INSTANCE.deleteById(message, param);
    },
    /**
     *
     * @param {Message} message
     * @param {string[]} param ids
     */
    dataSharePartnerDeleteByIds: async function (message, param) {
        SERVICE_INSTANCE.deleteByIds(message, param);
    },
    statisticDataSharePartner: async function (message, param) {
        try {
            let result = new StatisticDataSharePartnerDTO();
            let totalCount = [];
            (await getDb()).exec({
                sql: "SELECT COUNT(*) AS count FROM data_share_partner",
                rowMode: "object",
                resultRows: totalCount,
            });
            result.totalCount = totalCount[0].count;
            postSuccessMessage(message, result);
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] statisticDataSharePartner error : " + e.message
            );
        }
    }
};
