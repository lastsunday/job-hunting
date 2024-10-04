import { Message } from "../../common/api/message";
import { postSuccessMessage, postErrorMessage } from "../util";
import { insert, update, one, del, search, searchCount, batchDel } from "../database";
import { genUniqueId } from "../../common/utils";

export class BaseService {
    constructor(tableName, tableIdColumn, entityClassCreateFunction, searchDTOCreateFunction, whereConditionFunction) {
        this.tableName = tableName;
        this.tableIdColumn = tableIdColumn;
        this.entityClassCreateFunction = entityClassCreateFunction;
        this.searchDTOCreateFunction = searchDTOCreateFunction;
        this.whereConditionFunction = whereConditionFunction;
    }

    async search(message, param) {
        try {
            let result = this.searchDTOCreateFunction();
            result.items = await search(this.entityClassCreateFunction(), this.tableName, param, this.whereConditionFunction);
            result.total = await searchCount(this.entityClassCreateFunction(), this.tableName, param, this.whereConditionFunction);
            postSuccessMessage(message, result);
        } catch (e) {
            postErrorMessage(message, `[worker] search error : ` + e.message);
        }
    }

    /**
     * 
     * @param {Message} message 
     * @param {string} param id
     */
    async getById(message, param) {
        try {
            postSuccessMessage(message, (await one(this.entityClassCreateFunction(), this.tableName, this.tableIdColumn, param)));
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] getById error : " + e.message
            );
        }
    }

    async addOrUpdate(message, param) {
        try {
            let result = await this._addOrUpdate(param);
            postSuccessMessage(message, result);
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] addOrUpdate error : " + e.message
            );
        }
    }

    /**
     *
     * @param {Message} message
     * @param {string} param id
     */
    async deleteById(message, param) {
        try {
            await del(this.tableName, this.tableIdColumn, param);
            postSuccessMessage(message, {});
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] deleteById error : " + e.message
            );
        }
    }

    /**
     *
     * @param {Message} message
     * @param {string[]} param ids
     */
    async deleteByIds(message, param) {
        try {
            await batchDel(this.tableName, this.tableIdColumn, param);
            postSuccessMessage(message, {});
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] deleteByIds error : " + e.message
            );
        }
    }

    /**
     * 
     * @param {*} param 
     */
    async _addOrUpdate(param) {
        let needUpdate = false;
        if (param[this.tableIdColumn]) {
            needUpdate = (await one(this.entityClassCreateFunction(), this.tableName, this.tableIdColumn, param[this.tableIdColumn]) ? true : false);
        } else {
            needUpdate = false;
        }
        if (needUpdate) {
            await update(this.entityClassCreateFunction(), this.tableName, this.tableIdColumn, param);
        } else {
            param[this.tableIdColumn] = genUniqueId();
            await insert(this.entityClassCreateFunction(), this.tableName, param);
        }
        return param;
    }
}

