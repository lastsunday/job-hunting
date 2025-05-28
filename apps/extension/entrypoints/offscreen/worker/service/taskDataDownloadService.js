import { TASK_TYPE_METADATA_DATA_DOWNLOAD } from "@/common";
import { Message } from "@/common/api/message";
import { SearchTaskDataDownloadBO } from "@/common/data/bo/searchTaskDataDownloadBO";
import { TaskDataDownload } from "@/common/data/domain/taskDataDownload";
import { SearchTaskDataDownloadDTO } from "@/common/data/dto/searchTaskDataDownloadDTO";
import { postSuccessMessage } from "@/common/extension/worker/util";
import { dateToStr } from "@/common/utils/date";
import { convertRows, getDb } from "../database";
import { BaseService } from "./baseService";
import { genEqTextConditionSql, genInTextSql } from "./sqlUtil";
export const SERVICE_INSTANCE = new BaseService("task_data_download", "id",
  () => {
    return new TaskDataDownload();
  },
  () => {
    return new SearchTaskDataDownloadDTO();
  },
  (param) => {
    let whereCondition = "";
    if (param.userName) {
      whereCondition +=
        " AND username = '" +
        param.userName +
        "'";
    }
    if (param.type) {
      whereCondition += `AND type = '${param.type}'`;
    }
    whereCondition += genInTextSql(param.typeId, "type_id");
    if (param.repoName) {
      whereCondition +=
        " AND reponame = '" +
        param.repoName +
        "'";
    }
    if (param.startDatetime) {
      whereCondition +=
        " AND datetime >= '" +
        dateToStr(param.startDatetime) +
        "'";
    }
    if (param.endDatetime) {
      whereCondition +=
        " AND datetime < '" +
        dateToStr(param.endDatetime) +
        "'";
    }
    return whereCondition;
  }
);

export const TaskDataDownloadService = {
  /**
   * 
   * @param {Message} message 
   * @param {SearchTaskDataDownloadBO} param 
   * 
   * @returns SearchTaskDataDownloadDTO
   */
  searchTaskDataDownload: async function (message, param) {
    try {
      postSuccessMessage(message, await _searchTaskDataDownload({ param }));
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] searchTaskDataDownload error : " + e.message
      );
    }
  },
  /**
   *
   * @param {Message} message
   * @param {string} param id
   */
  taskDataDownloadGetById: async function (message, param) {
    try {
      postSuccessMessage(message, await _taskDataDownloadGetById({ param }));
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] taskDataDownloadGetById error : " + e.message
      );
    }
  },
  /**
   *
   * @param {Message} message
   * @param {TaskDataDownload} param
   */
  taskDataDownloadAddOrUpdate: async function (message, param) {
    try {
      postSuccessMessage(message, await _taskDataDownloadAddOrUpdate({ param }));
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] taskDataDownloadAddOrUpdate error : " + e.message
      );
    }
  },
  /**
   *
   * @param {Message} message
   * @param {string} param id
   */
  taskDataDownloadDeleteById: async function (message, param) {
    SERVICE_INSTANCE.deleteById(message, param);
  },
  /**
   *
   * @param {Message} message
   * @param {string[]} param ids
   */
  taskDataDownloadDeleteByIds: async function (message, param) {
    SERVICE_INSTANCE.deleteByIds(message, param);
  }

};

export const _taskDataDownloadGetById = async ({ param = null, connection = null } = {}) => {
  return await SERVICE_INSTANCE._getById(param, { connection });
}

export const _taskDataDownloadAddOrUpdate = async ({ param = null, connection = null } = {}) => {
  param.datetime = dateToStr(param.datetime);
  return await SERVICE_INSTANCE._addOrUpdate(param, { connection });;
}

export const _searchTaskDataDownload = async ({ param = null, connection = null } = {}) => {
  return await SERVICE_INSTANCE._search(param, { connection });
}

export const _queryLatestTaskDataDownload = async ({ param = null, connection = null } = {}) => {
  connection ??= await getDb();
  const typeId = param.typeId;
  const datetime = dateToStr(param.datetime);
  const sql = `SELECT t1.id AS id,t2.datetime AS datetime FROM task AS t1 LEFT JOIN task_data_download AS t2 ON t1.data_id = t2.id WHERE t1.type = '${TASK_TYPE_METADATA_DATA_DOWNLOAD}' ${genEqTextConditionSql(typeId, 't2.type_id')} AND (t1.status IN ('READY','RUNNING','ERROR') OR t2.datetime = '${datetime}') ORDER BY t2.datetime DESC`;
  const { rows } = await connection.query(sql);
  return convertRows(rows);
}

