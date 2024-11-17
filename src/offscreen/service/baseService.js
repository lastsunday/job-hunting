import { Message } from "../../common/api/message";
import { postSuccessMessage, postErrorMessage } from "../util";
import { insert, update, one, del, search, searchCount, batchDel, batchGet } from "../database";
import { genUniqueId } from "../../common/utils";

export class BaseService {
    constructor(tableName, tableIdColumn, entityClassCreateFunction, searchDTOCreateFunction, whereConditionFunction) {
        this.tableName = tableName;
        this.tableIdColumn = tableIdColumn;
        this.entityClassCreateFunction = entityClassCreateFunction;
        this.searchDTOCreateFunction = searchDTOCreateFunction;
        this.whereConditionFunction = whereConditionFunction;
    }

    async search(message, param, { detailInjectAsyncCallback } = { detailInjectAsyncCallback: null }) {
        try {
            let result = this.searchDTOCreateFunction();
            result.items = await search(this.entityClassCreateFunction(), this.tableName, param, this.whereConditionFunction);
            result.total = await searchCount(this.entityClassCreateFunction(), this.tableName, param, this.whereConditionFunction);
            if (detailInjectAsyncCallback) {
                result = await detailInjectAsyncCallback(result);
            }
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

    /**
     * 
     * @param {Message} message 
     * @param {string[]} param ids
     */
    async getByIds(message, param) {
        try {
            postSuccessMessage(message, (await this._getByIds(param)));
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] getByIds error : " + e.message
            );
        }
    }

    /**
     * 
     * @param {Message} message 
     * @param {string[]} param ids
     */
    async _getByIds(param) {
        return batchGet(this.entityClassCreateFunction(), this.tableName, this.tableIdColumn, param);
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
     * @param {string} id
     * @param {string} column 
     */
    async deleteById(message, id, column) {
        try {
            await _deleteById(this.tableName, column, id);
            postSuccessMessage(message, {});
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] deleteById error : " + e.message
            );
        }
    }

    /**
    * @param {string} id
    * @param {string} column 
    */
    async _deleteById(id, column) {
        return del(this.tableName, column ?? this.tableIdColumn, id);
    }

    /**
     *
     * @param {Message} message
     * @param {string[]} ids
     * @param {string} column 
     */
    async deleteByIds(message, ids, column) {
        try {
            if (ids && ids.length > 0) {
                await this._deleteByIds(ids, column);
                postSuccessMessage(message, {});
            } else {
                postErrorMessage(
                    message,
                    "[worker] deleteByIds error : ids is empty"
                );
            }
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] deleteByIds error : " + e.message
            );
        }
    }

    /**
     * @param {string[]} ids
     * @param {string} column 
     */
    async _deleteByIds(ids, column) {
        return batchDel(this.tableName, column ?? this.tableIdColumn, ids);
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

