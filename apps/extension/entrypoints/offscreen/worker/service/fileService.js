import { Message } from '@/common/api/message';
import { SearchFileBO } from '@/common/data/bo/searchFileBO';
import { File } from '@/common/data/domain/file';
import { FileDTO } from '@/common/data/dto/fileDTO';
import { FileStatisticDTO } from '@/common/data/dto/fileStatisticDTO';
import { SearchFileDTO } from '@/common/data/dto/searchFileDTO';
import {
  postErrorMessage,
  postSuccessMessage,
} from '@/common/extension/worker/util';
import dayjs from 'dayjs';
import { getAll, getDb } from '../database';
import { BaseService } from './baseService';

const SERVICE_INSTANCE = new BaseService(
  'file',
  'id',
  () => {
    return new File();
  },
  () => {
    return new SearchFileDTO();
  },
  (param) => {
    let whereCondition = '';
    if (param.id) {
      whereCondition += ` AND id LIKE '%${param.id}%'`;
    }
    if (param.name) {
      whereCondition += ` AND name LIKE '%${param.name}%'`;
    }
    if (param.isDelete != null) {
      whereCondition += ` AND is_delete = ${param.isDelete}`;
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

export const FileService = {
  /**
   *
   * @param {Message} message
   * @param {SearchFileBO} param
   *
   * @returns SearchFileDTO
   */
  searchFile: async function (message, param) {
    SERVICE_INSTANCE.search(message, param);
  },
  /**
   *
   * @param {Message} message
   * @param {string} param id
   */
  fileGetById: async function (message, param) {
    try {
      postSuccessMessage(message, await _fileGetById({ param }));
    } catch (e) {
      postErrorMessage(message, '[worker] fileGetById error : ' + e.message);
    }
  },
  /**
   *
   * @param {Message} message
   * @param {File} param
   */
  fileAddOrUpdate: async function (message, param) {
    try {
      postSuccessMessage(message, await _fileAddOrUpdate({ param }));
    } catch (e) {
      postErrorMessage(
        message,
        '[worker] fileAddOrUpdate error : ' + e.message
      );
    }
  },
  /**
   *
   * @param {Message} message
   * @param {string} param id
   */
  fileDeleteById: async function (message, param) {
    SERVICE_INSTANCE.deleteById(message, param);
  },
  /**
   *
   * @param {Message} message
   * @param {string[]} param ids
   */
  fileDeleteByIds: async function (message, param) {
    SERVICE_INSTANCE.deleteByIds(message, param);
  },
  /**
   *
   * @param {Message} message
   * @param {string[]} param ids
   */
  fileLogicDeleteByIds: async function (message, param) {
    try {
      postSuccessMessage(message, await _fileLogicDeleteByIds({ param }));
    } catch (e) {
      postErrorMessage(
        message,
        '[worker] fileLogicDeleteByIds error : ' + e.message
      );
    }
  },
  fileGetAllNotDeleteFile: async function (message, param) {
    try {
      postSuccessMessage(message, await _fileGetAllNotDeleteFile({}));
    } catch (e) {
      postErrorMessage(
        message,
        '[worker] fileGetAllMergedNotDeleteFile error : ' + e.message
      );
    }
  },

  /**
   *
   * @param {Message} message
   * @param {void} param
   */
  fileStatistic: async function (message, param) {
    try {
      let result = new FileStatisticDTO();

      const mergeFileSizeTotalSql = `SELECT COALESCE(SUM(t1.size),0) AS total  from file t1 LEFT JOIN task_data_merge t2 ON t1.id = t2.data_id LEFT JOIN task t3 ON t2.id = t3.data_id`;
      const { rows: mergeFileSizeTotalRows } = await (
        await getDb()
      ).query(mergeFileSizeTotalSql);
      result.mergeFileSizeTotal = Number.parseInt(
        mergeFileSizeTotalRows[0].total
      );

      const mergeNotDeleteFileSizeTotalSql = `SELECT COALESCE(SUM(t1.size),0) AS total  from file t1 LEFT JOIN task_data_merge t2 ON t1.id = t2.data_id LEFT JOIN task t3 ON t2.id = t3.data_id WHERE t1.is_delete = FALSE`;
      const { rows: mergeNotDeleteFileSizeTotalRows } = await (
        await getDb()
      ).query(mergeNotDeleteFileSizeTotalSql);
      result.mergeNotDeleteFileSizeTotal = Number.parseInt(
        mergeNotDeleteFileSizeTotalRows[0].total
      );

      const mergeFileCountSql = `SELECT COUNT(*) AS total  from file t1 LEFT JOIN task_data_merge t2 ON t1.id = t2.data_id LEFT JOIN task t3 ON t2.id = t3.data_id`;
      const { rows: mergeFileCountRows } = await (
        await getDb()
      ).query(mergeFileCountSql);
      result.mergeFileCount = mergeFileCountRows[0].total;

      const mergeNotDeleteFileCountSql = `SELECT COUNT(*) AS total  from file t1 LEFT JOIN task_data_merge t2 ON t1.id = t2.data_id LEFT JOIN task t3 ON t2.id = t3.data_id WHERE t1.is_delete = FALSE`;
      const { rows: mergeNotDeleteFileCountRows } = await (
        await getDb()
      ).query(mergeNotDeleteFileCountSql);
      result.mergeNotDeleteFileCount = mergeNotDeleteFileCountRows[0].total;

      postSuccessMessage(message, result);
    } catch (e) {
      postErrorMessage(message, '[worker] fileStatistic error : ' + e.message);
    }
  },
};

export const _fileGetById = async ({
  param = null,
  connection = null,
} = {}) => {
  return await SERVICE_INSTANCE._getById(param, { connection });
};

export const _fileAddOrUpdate = async ({
  param = null,
  connection = null,
} = {}) => {
  return await SERVICE_INSTANCE._addOrUpdate(param, { connection });
};

class NotDeleteFile {
  id;
  dataId;
  status;
  size;
  updateDatetime;
}

export const _fileGetAllNotDeleteFile = async ({
  param = null,
  connection = null,
} = {}) => {
  return await getAll(
    `SELECT t2.id,t1.data_id,t2.status,t3.size,t3.update_datetime FROM task_data_merge as t1 LEFT JOIN task t2 ON t1.id = t2.data_id LEFT JOIN file as t3 ON t3.id = t1.data_id WHERE t1.data_id IN (SELECT file.id FROM file WHERE file.is_delete = false) ORDER BY t3.update_datetime DESC`,
    [],
    new NotDeleteFile(),
    { connection }
  );
};

export const _fileLogicDeleteByIds = async ({
  param = null,
  connection = null,
} = {}) => {
  if (param && param.length > 0) {
    let ids = "'" + param.join("','") + "'";
    await connection.exec(
      `UPDATE file SET content = '',is_delete = TRUE WHERE id in(${ids}) `
    );
  }
};
