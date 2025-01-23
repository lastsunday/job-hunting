import { Message } from "@/common/api/message";
import { SearchDataSharePartnerBO } from "@/common/data/bo/searchDataSharePartnerBO";
import { DataSharePartner } from "@/common/data/domain/dataSharePartner";
import { SearchDataSharePartnerDTO } from "@/common/data/dto/searchDataSharePartnerDTO";
import { StatisticDataSharePartnerDTO } from "@/common/data/dto/statisticDataSharePartnerDTO";
import { postErrorMessage, postSuccessMessage } from "@/common/extension/worker/util";
import dayjs from "dayjs";
import { getDb } from "../database";
import { BaseService } from "./baseService";

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

export const DataSharePartnerService = {
    /**
     * 
     * @param {Message} message 
     * @param {SearchDataSharePartnerBO} param 
     * 
     * @returns SearchDataSharePartnerDTO
     */
    searchDataSharePartner: async function (message, param) {
        try {
            postSuccessMessage(message, await _searchDataSharePartner({ param }));
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] searchDataSharePartner error : " + e.message
            );
        }
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
            await (await getDb()).transaction(async (tx) => {
                return await SERVICE_INSTANCE._batchAddOrUpdate(param, { connection: tx });
            });
            postSuccessMessage(message, param);
        } catch (e) {
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
            result.totalCount = await SERVICE_INSTANCE._count();
            postSuccessMessage(message, result);
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] statisticDataSharePartner error : " + e.message
            );
        }
    }
};

export const _searchDataSharePartner = async ({ param = null, connection = null } = {}) => {
    return await SERVICE_INSTANCE._search(param, { connection });
}