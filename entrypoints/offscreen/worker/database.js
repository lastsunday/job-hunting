import { postErrorMessage, postSuccessMessage } from "@/common/extension/worker/util";
import { debugLog, errorLog, infoLog, isDebug } from "@/common/log";
import { convertEmptyStringToNull, toHump, toLine } from "@/common/utils";
import dayjs from "dayjs";
import { getChangeLogList, initChangeLog } from "./changeLog";
import { ChangeLogV1 } from "./changeLog/changeLogV1";
import { ChangeLogV10 } from './changeLog/changeLogV10';
import { ChangeLogV11 } from './changeLog/changeLogV11';
import { ChangeLogV2 } from "./changeLog/changeLogV2";
import { ChangeLogV3 } from './changeLog/changeLogV3';
import { ChangeLogV4 } from './changeLog/changeLogV4';
import { ChangeLogV5 } from './changeLog/changeLogV5';
import { ChangeLogV6 } from './changeLog/changeLogV6';
import { ChangeLogV7 } from './changeLog/changeLogV7';
import { ChangeLogV8 } from './changeLog/changeLogV8';
import { ChangeLogV9 } from './changeLog/changeLogV9';

import { PGlite } from '@electric-sql/pglite';

const DATA_DIR = "data";
const JOB_DIR = "job";
const JOB_DB_PATH = "/" + DATA_DIR + "/" + JOB_DIR + "/";
let db;
let initializing = false;

export async function getDb() {
  return await Database.innerInit();
}

export async function getOne(sql, bind, obj, { connection = null } = {}) {
  connection ??= await getDb();
  let resultItem = null;
  const { rows } = await connection.query(sql, bind);
  if (rows.length > 0) {
    let item = rows[0];
    resultItem = obj;
    let keys = Object.keys(item);
    for (let n = 0; n < keys.length; n++) {
      let key = keys[n];
      resultItem[toHump(key)] = item[key];
    }
  }
  return resultItem;
}

export async function getAll(sql, bind, obj, { connection = null } = {}) {
  connection ??= await getDb();
  const { rows } = await connection.query(sql, bind);
  let result = [];
  if (rows.length > 0) {
    for (let i = 0; i < rows.length; i++) {
      let item = rows[i];
      let resultItem = Object.assign({}, obj);
      let keys = Object.keys(item);
      for (let n = 0; n < keys.length; n++) {
        let key = keys[n];
        resultItem[toHump(key)] = item[key];
      }
      result.push(resultItem);
    }
  }
  return result;
}

export function genFullSelectSQL(obj, tableName) {
  let column = [];
  let keys = Object.keys(obj);
  for (let n = 0; n < keys.length; n++) {
    let key = keys[n];
    column.push(toLine(key));
  }
  return `SELECT ${column.join(",")} FROM ${tableName}`;
}

export function genFullSelectByIdSQL(obj, tableName, idColumnName, id) {
  return `${genFullSelectSQL(obj, tableName)} WHERE ${idColumnName} = '${id}'`;
}

export async function batchInsert(obj, tableName, params, { overrideCreateDatetime = false, overrideUpdateDatetime = false, connection = null } = {}) {
  return batchInsertOrReplace(obj, tableName, null, params, { replace: false, overrideCreateDatetime, overrideUpdateDatetime, connection })
}

export async function batchInsertOrReplace(obj, tableName, tableIdColumn, params, { replace = true, overrideCreateDatetime = false, overrideUpdateDatetime = false, connection = null } = {}) {
  connection ??= await getDb();
  if (params && params.length > 0) {
    //https://www.sqlite.org/limits.html
    //Maximum Number Of Host Parameters In A Single SQL Statement
    //To prevent excessive memory allocations, the maximum value of a host parameter number is SQLITE_MAX_VARIABLE_NUMBER, which defaults to 999 for SQLite versions prior to 3.32.0 (2020-05-22) or 32766 for SQLite versions after 3.32.0.
    //在PGlite里暂时先借用该规则，这数值不一定合理。
    let maxVarLength = 32766;
    let paramVarLength = Object.keys(obj).length;
    let maxRecordCountForOneExec = Number.parseInt(maxVarLength / paramVarLength);
    let recordTotal = params.length;
    let count = Number.parseInt(recordTotal / maxRecordCountForOneExec);
    let modCount = recordTotal % maxRecordCountForOneExec;
    if (modCount > 0) {
      count = count + 1;
    }
    for (let i = 0; i < count; i++) {
      let start = i * maxRecordCountForOneExec;
      let end = (i + 1) * maxRecordCountForOneExec;
      if (i == count.length - 1) {
        //last index
        end = recordTotal;
      }
      let rangeParam = params.slice(start, end);
      const batchInsertOrReplaceSQL = genRawBatchFullInsertOrReplaceSQL(obj, tableName, tableIdColumn, rangeParam, { replace, overrideCreateDatetime });
      if (isDebug()) {
        debugLog(`[database] [batchInsertOrReplace] batchInsertOrReplaceSQL = ${batchInsertOrReplaceSQL}`)
      }
      let bindValue = genInsertValueBindValue(obj, rangeParam, { overrideCreateDatetime, overrideUpdateDatetime });
      await connection.query(batchInsertOrReplaceSQL, bindValue);
    }
  }
}

export function genRawBatchFullInsertOrReplaceSQL(obj, tableName, tableIdColumn, params, { replace = true, overrideCreateDatetime = false } = {}) {
  let column = [];
  let keys = Object.keys(obj);
  for (let n = 0; n < keys.length; n++) {
    let key = keys[n];
    column.push(toLine(key));
  }
  let valuesSql = genInsertValueSQL(obj, params);
  let updateSql = replace ? genUpdateValueSQL(obj, tableIdColumn, { overrideCreateDatetime }) : '';
  return `INSERT INTO ${tableName} (${column.join(",")}) VALUES ${valuesSql} ${updateSql}`;
}

function genUpdateValueSQL(obj, tableIdColumn, { overrideCreateDatetime = false } = {}) {
  let updateColumns = [];
  let keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    let key = toLine(keys[i]);
    if (key != "create_datetime" || overrideCreateDatetime) {
      updateColumns.push(`${toLine(key)} = EXCLUDED.${key}`);
    }
  }
  return `ON CONFLICT (${tableIdColumn}) DO UPDATE SET ${updateColumns.join(",")}`
}

function genInsertValueBindValue(obj, params, { overrideCreateDatetime = false, overrideUpdateDatetime = false } = {}) {
  let now = new Date();
  let values = [];
  let keys = Object.keys(obj);
  for (let i = 0; i < params.length; i++) {
    let param = params[i];
    for (let n = 0; n < keys.length; n++) {
      let key = keys[n];
      if (key == "createDatetime") {
        if (overrideCreateDatetime) {
          values.push(`${dayjs(param[`${key}` ?? now]).format()}`);
        } else {
          values.push(`${dayjs(now).format()}`);
        }
      } else if (key == "updateDatetime") {
        if (overrideUpdateDatetime) {
          values.push(`${dayjs(param[`${key}` ?? now]).format()}`);
        } else {
          values.push(`${dayjs(now).format()}`);
        }
      } else {
        let value = convertEmptyStringToNull(param[`${key}`]);
        values.push(value);
      }
    }
  }
  return values;
}

function genInsertValueSQL(obj, params) {
  let insertValues = [];
  for (let i = 0; i < params.length; i++) {
    let values = [];
    let keys = Object.keys(obj);
    for (let n = 0; n < keys.length; n++) {
      values.push(`$${i * keys.length + n + 1}`);
    }
    insertValues.push(`(${values.join(",")})`);
  }
  return insertValues.join(",");
}


export async function one(entity, tableName, idColumn, id, { connection = null } = {}) {
  const selectOneSql = genFullSelectByIdSQL(entity, tableName, idColumn, id);
  if (isDebug()) {
    debugLog(`[database] [one] selectOneSql = ${selectOneSql}`)
  }
  return await getOne(selectOneSql, [], entity, { connection });
}

export async function all(entity, tableName, orderBy, { connection = null } = {}) {
  let selectAllSql = genFullSelectSQL(entity, tableName);
  if (orderBy) {
    selectAllSql += ` ORDER BY ${orderBy}`
  }
  if (isDebug()) {
    debugLog(`[database] [all] selectAllSql = ${selectAllSql}`)
  }
  return getAll(selectAllSql, [], entity, { connection })
}

export async function batchGet(obj, tableName, idColumnName, ids, { connection = null } = {}) {
  connection ??= await getDb();
  if (ids.length == 0) {
    return [];
  }
  const batchGetSql = genFullSelectByIdsSQL(obj, tableName, idColumnName, ids);
  if (isDebug()) {
    debugLog(`[database] [batchGet] batchGetSql = ${batchGetSql}`)
  }
  const { rows } = await connection.query(batchGetSql);
  return convertRows(rows);
}

export function genFullSelectByIdsSQL(obj, tableName, idColumnName, ids) {
  let idsString = "'" + ids.join("','") + "'";
  return `${genFullSelectSQL(obj, tableName)} WHERE ${idColumnName} in (${idsString})`;
}

export async function del(tableName, idColumn, id, { otherCondition = null, connection = null } = {}) {
  connection ??= await getDb();
  const deleteSql = `DELETE FROM ${tableName} WHERE ${idColumn} = '${id}' ${otherCondition ? "AND " + otherCondition : ""}`;
  if (isDebug()) {
    debugLog(`[database] [del] deleteSql = ${deleteSql}`)
  }
  return await connection.exec(deleteSql);
}

export async function batchDel(tableName, idColumn, ids, { otherCondition = null, connection = null } = {}) {
  connection ??= await getDb();
  let idsString = "'" + ids.join("','") + "'";
  const deleteSql = `DELETE FROM ${tableName} WHERE ${idColumn} in (${idsString}) ${otherCondition ? "AND " + otherCondition : ""}`;
  if (isDebug()) {
    debugLog(`[database] [batchDel] deleteSql = ${deleteSql}`)
  }
  return await connection.exec(deleteSql);
}

export async function search(entity, tableName, param, whereConditionFunction, { connection = null } = {}) {
  connection ??= await getDb();
  let sqlQuery = "";
  let whereCondition = "";
  if (whereConditionFunction) {
    whereCondition += whereConditionFunction(param);
  }
  if (whereCondition.startsWith(" AND")) {
    whereCondition = whereCondition.replace("AND", "");
    whereCondition = " WHERE " + whereCondition;
  }
  let orderBy = "";
  if (param.orderByColumn != null && param.orderBy != null) {
    orderBy =
      " ORDER BY " +
      toLine(param.orderByColumn) +
      " " +
      param.orderBy +
      " NULLS LAST";
  }
  let limit = '';
  if (param.pageNum != null && param.pageSize != null) {
    let limitStart = (param.pageNum - 1) * param.pageSize;
    let limitEnd = param.pageSize;
    limit = " limit " + limitEnd + " OFFSET " + limitStart;
  }
  const sqlSearchQuery = genFullSelectSQL(Object.assign({}, entity), tableName);
  sqlQuery += sqlSearchQuery;
  sqlQuery += whereCondition;
  sqlQuery += orderBy;
  sqlQuery += limit;
  let items = [];
  const { rows: queryRows } = await connection.query(sqlQuery);
  for (let i = 0; i < queryRows.length; i++) {
    let resultItem = Object.assign({}, entity);
    let item = queryRows[i];
    let keys = Object.keys(item);
    for (let n = 0; n < keys.length; n++) {
      let key = keys[n];
      resultItem[toHump(key)] = item[key];
    }
    items.push(resultItem);
  }
  return items;
}

export async function searchCount(entity, tableName, param, whereConditionFunction, { connection = null } = {}) {
  connection ??= await getDb();
  let sqlCountSubTable = "";
  const sqlSearchQuery = genFullSelectSQL(Object.assign({}, entity), tableName);
  let whereCondition = "";
  if (whereConditionFunction) {
    whereCondition += whereConditionFunction(param);
  }
  if (whereCondition.startsWith(" AND")) {
    whereCondition = whereCondition.replace("AND", "");
    whereCondition = " WHERE " + whereCondition;
  }
  sqlCountSubTable += sqlSearchQuery;
  sqlCountSubTable += whereCondition;
  //count
  let sqlCount = `SELECT COUNT(*) AS total FROM (${sqlCountSubTable}) AS t1`;
  const { rows } = await connection.query(sqlCount);
  const total = rows[0].total;
  return total;
}

/**
 * 
 * @param {string[]} param ids
 */
export async function sort(tableName, idColumnName, param, { connection = null } = {}) {
  const now = new Date();
  const nowDatetimeString = dayjs(now).format();
  connection ??= await getDb();
  if (param && param.length > 0) {
    param.forEach(async (id, index) => {
      await connection.query(`UPDATE ${tableName} SET seq=$1,update_datetime=$2 WHERE ${idColumnName} = $2`, [index, nowDatetimeString, id]);
    });
  }
}

export const Database = {
  /**
   *
   * @param {*} message
   * @param {*} param
   */
  init: async function (message, param) {
    try {
      await Database.innerInit();
    } catch (e) {
      postErrorMessage(message, "init database error : " + e.message);
    }
    postSuccessMessage(message);
  },

  innerInit: async function () {
    return new Promise(async (resolve, reject) => {
      if (initializing) {
        resolve(db);
      }
      if (!initializing) {
        try {
          debugLog("Loading and initializing...");
          let changelogList = [];
          changelogList.push(new ChangeLogV1());
          changelogList.push(new ChangeLogV2());
          changelogList.push(new ChangeLogV3());
          changelogList.push(new ChangeLogV4());
          changelogList.push(new ChangeLogV5());
          changelogList.push(new ChangeLogV6());
          changelogList.push(new ChangeLogV7());
          changelogList.push(new ChangeLogV8());
          changelogList.push(new ChangeLogV9());
          changelogList.push(new ChangeLogV10());
          changelogList.push(new ChangeLogV11());
          initChangeLog(changelogList);
          initDb();
          initializing = true;
          debugLog("Done initializing. Running app...");
          resolve(db);
        } catch (e) {
          reject("init database error : " + e.message);
        }
      } else {
        resolve(db);
      }
    });
  },
  /**
   *
   * @param {*} message
   * @param { void } param
   */
  dbExport: async function (message, param) {
    try {
      let file = await db.dumpDataDir();
      postSuccessMessage(message, URL.createObjectURL(file));
    } catch (e) {
      postErrorMessage(message, "[worker] dbExport error : " + e.message);
    }
  },

  /**
   *
   * @param {*} message
   * @param {string} param base64 zip file
   */
  dbImport: async function (message, param) {
    try {
      // let blob = await fetch(param).then(r => r.blob());
      // await (await getDb()).close();
      // await _dbDelete();
      // await PGlite.create({
      //   dataDir: `opfs-ahp://${JOB_DB_PATH}`,
      //   loadDataDir: blob,
      // });
      // postSuccessMessage(message, {});
      // TODO throw No more file handles available in the pool
      postErrorMessage(message, "not implemented yet");
    } catch (e) {
      postErrorMessage(message, "[worker] dbImport error : " + e.message);
    }
  },
  dbClose: async function (message, param) {
    try {
      await (await getDb()).close();
      postSuccessMessage(message, {});
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] dbClose error : " + e.message
      );
    }
  },
  dbDelete: async function (message, param) {
    try {
      await _dbDelete();
      postSuccessMessage(message, {});
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] dbDelete error : " + e.message
      );
    }
  },
  dbSize: async function (message, param) {
    try {
      let sql = `SELECT SUM(t1.pg_relation_size) AS total FROM (SELECT PG_RELATION_SIZE(relid) FROM pg_stat_user_tables) AS t1`;
      const { rows } = await (await getDb()).query(sql);
      const total = rows[0].total;
      postSuccessMessage(message, { total });
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] dbSize error : " + e.message
      );
    }
  },
  dbSchemaVersion: async function (message, param) {
    try {
      let sql = `SELECT num FROM version;`;
      const { rows } = await (await getDb()).query(sql);
      const version = rows[0].num;
      postSuccessMessage(message, { version });
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] dbSchemaVersion error : " + e.message
      );
    }
  },
  dbExec: async function (message, param) {
    try {
      let sql = param.sql;
      const { rows, fields, affectedRows } = await (await getDb()).query(sql);
      postSuccessMessage(message, { result: { rows, fields, affectedRows } });
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] dbExec error : " + e.message
      );
    }
  },
  dbGetAllTableName: async function (message, param) {
    try {
      let sql = `select tablename as name from pg_tables where schemaname = 'public'`;
      const { rows: result } = await (await getDb()).query(sql);
      postSuccessMessage(message, { result });
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] dbGetAllTableName error : " + e.message
      );
    }
  }

};

const _dbDelete = async () => {
  (await getDb()).close();
  const root = await navigator.storage.getDirectory();
  const fileHandle = await root.getDirectoryHandle(DATA_DIR);
  await fileHandle.removeEntry(JOB_DIR, { recursive: true });
}

/**
 *
 * @returns
 */
const initDb = async function () {
  db = new PGlite(`opfs-ahp://${JOB_DB_PATH}`);
  infoLog("[DB] schema checking...");
  let changelogList = getChangeLogList();
  let oldVersion = 0;
  let newVersion = changelogList.length;
  try {
    await db.transaction(async (tx) => {
      const SQL_CREATE_TABLE_VERSION = `
          CREATE TABLE IF NOT EXISTS version(
          num INTEGER
        )
      `;
      await tx.exec(SQL_CREATE_TABLE_VERSION);
      const SQL_QUERY_VERSION = "SELECT num FROM version";
      let result = await tx.query(SQL_QUERY_VERSION);
      let rows = result.rows;
      if (rows.length > 0) {
        oldVersion = rows[0].num;
      } else {
        const SQL_INSERT_VERSION = `INSERT INTO version(num) values($1)`;
        await tx.query(SQL_INSERT_VERSION, [0]);
      }
      infoLog(
        "[DB] schema oldVersion = " + oldVersion + ", newVersion = " + newVersion
      );
      if (newVersion > oldVersion) {
        infoLog("[DB] schema upgrade start");
        for (let i = oldVersion; i < newVersion; i++) {
          let currentVersion = i + 1;
          let changelog = changelogList[i];
          let sqlList = changelog.getSqlList();
          infoLog(
            "[DB] schema upgrade changelog version = " +
            currentVersion +
            ", sql total = " +
            sqlList.length
          );
          for (let seq = 0; seq < sqlList.length; seq++) {
            infoLog(
              "[DB] schema upgrade changelog version = " +
              currentVersion +
              ", execute sql = " +
              (seq + 1) +
              "/" +
              sqlList.length
            );
            let sql = sqlList[seq];
            await tx.exec(sql);
          }
        }
        const SQL_UPDATE_VERSION = `UPDATE version SET num = $1`;
        await tx.query(SQL_UPDATE_VERSION, [newVersion]);
        infoLog("[DB] schema upgrade finish to version = " + newVersion);
        infoLog("[DB] current schema version = " + newVersion);
      } else {
        infoLog("[DB] skip schema upgrade");
        infoLog("[DB] current schema version = " + oldVersion);
      }
    });
  } catch (e) {
    errorLog("[DB] schema upgrade fail," + e.message);
  }
};

export function convertRows(rows) {
  let result = [];
  if (rows.length > 0) {
    let keys = Object.keys(rows[0]);
    rows.forEach(item => {
      let obj = {};
      keys.forEach(key => {
        obj[toHump(key)] = item[key]
      });
      result.push(obj);
    });
  }
  return result;
}