import { infoLog, debugLog, errorLog, isDebug } from "../common/log";
import sqlite3InitModule from "@sqlite.org/sqlite-wasm";
import { ChangeLogV1 } from "./changeLog/changeLogV1";
import { ChangeLogV2 } from "./changeLog/changeLogV2";
import { ChangeLogV3 } from './changeLog/changeLogV3';
import { ChangeLogV4 } from './changeLog/changeLogV4';
import { ChangeLogV5 } from './changeLog/changeLogV5';
import { initChangeLog, getChangeLogList } from "./changeLog";
import { bytesToBase64, base64ToBytes } from "../common/utils/base64.js";
import JSZip from "jszip";
import { postSuccessMessage, postErrorMessage } from "./util";
import { toHump, toLine, convertEmptyStringToNull } from "../common/utils";
import dayjs from "dayjs";

const JOB_DB_FILE_NAME = "job.sqlite3";
const JOB_DB_PATH = "/" + JOB_DB_FILE_NAME;
let capi;
let oo;
let db;
let initializing = false;

export async function getDb() {
  await Database.innerInit();
  return db;
}

export async function getOne(sql, bind, obj) {
  let resultItem = null;
  let rows = [];
  (await getDb()).exec({
    sql: sql,
    rowMode: "object",
    bind: bind,
    resultRows: rows,
  });
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

export async function getAll(sql, bind, obj) {
  let rows = [];
  (await getDb()).exec({
    sql: sql,
    rowMode: "object",
    bind: bind,
    resultRows: rows,
  });
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

export function genFullInsertSQL(obj, tableName) {
  let column = [];
  let columnParam = [];
  let keys = Object.keys(obj);
  for (let n = 0; n < keys.length; n++) {
    let key = keys[n];
    column.push(toLine(key));
    columnParam.push(`$${toLine(key)}`);
  }
  return `INSERT INTO ${tableName} (${column.join(",")}) VALUES (${columnParam.join(",")})`;
}

export async function insert(obj, tableName, param) {
  const targetObj = Object.assign(obj, param)
  const insertSQL = genFullInsertSQL(targetObj, tableName);
  const bindObject = genFullBindObject(targetObj);
  if (isDebug()) {
    debugLog(`[database] [insert] insertSQL = ${insertSQL}`)
    debugLog(`[database] [insert] bindObject = ${JSON.stringify(bindObject)}`)
  }
  return (await getDb()).exec({
    sql: insertSQL,
    bind: bindObject,
  });
}

export async function update(obj, tableName, idColumn, param) {
  const targetObj = Object.assign(obj, param)
  const updateSQL = genFullUpdateSQL(targetObj, tableName, idColumn);
  const bindObject = genFullBindObject(targetObj);
  delete bindObject.$create_datetime;
  if (isDebug()) {
    debugLog(`[database] [update] updateSQL = ${updateSQL}`)
    debugLog(`[database] [update] bindObject = ${JSON.stringify(bindObject)}`)
  }
  return (await getDb()).exec({
    sql: updateSQL,
    bind: bindObject,
  });
}

export function genFullUpdateSQL(obj, tableName, idColumn) {
  let column = [];
  let keys = Object.keys(obj);
  for (let n = 0; n < keys.length; n++) {
    let key = keys[n];
    if (key != "createDatetime" && key != idColumn) {
      column.push(`${toLine(key)}=$${toLine(key)}`);
    }
  }
  return `UPDATE ${tableName} SET ${column.join(",")} WHERE ${idColumn} = $${idColumn}`;
}

export function genFullBindObject(obj) {
  let now = new Date();
  const result = {};
  let keys = Object.keys(obj);
  for (let n = 0; n < keys.length; n++) {
    let key = keys[n];
    if (key == "createDatetime" || key == "updateDatetime") {
      result[`$${toLine(key)}`] = dayjs(now).format("YYYY-MM-DD HH:mm:ss");
    } else {
      result[`$${toLine(key)}`] = convertEmptyStringToNull(obj[`${key}`])
    }
  }
  return result;
}

export async function one(entity, tableName, idColumn, id) {
  const selectOneSql = genFullSelectByIdSQL(entity, tableName, idColumn, id);
  if (isDebug()) {
    debugLog(`[database] [one] selectOneSql = ${selectOneSql}`)
  }
  return await getOne(selectOneSql, {}, entity);
}

export async function all(entity, tableName, orderBy) {
  let selectAllSql = genFullSelectSQL(entity, tableName);
  if (orderBy) {
    selectAllSql += ` ORDER BY ${orderBy}`
  }
  if (isDebug()) {
    debugLog(`[database] [all] selectAllSql = ${selectAllSql}`)
  }
  return getAll(selectAllSql, {}, entity)
}

export async function del(tableName, idColumn, id) {
  const deleteSql = `DELETE FROM ${tableName} WHERE ${idColumn} = '${id}'`;
  if (isDebug()) {
    debugLog(`[database] [del] deleteSql = ${deleteSql}`)
  }
  return (await getDb()).exec({
    sql: deleteSql,
  });
}

export async function batchDel(tableName, idColumn, ids) {
  let idsString = "'" + ids.join("','") + "'";
  const deleteSql = `DELETE FROM ${tableName} WHERE ${idColumn} in (${idsString})`;
  if (isDebug()) {
    debugLog(`[database] [batchDel] deleteSql = ${deleteSql}`)
  }
  return (await getDb()).exec({
    sql: deleteSql,
  });
}

export async function search(entity, tableName, param, whereConditionFunction) {
  let sqlQuery = "";
  let whereCondition = "";
  whereCondition += whereConditionFunction(param);
  if (whereCondition.startsWith(" AND")) {
    whereCondition = whereCondition.replace("AND", "");
    whereCondition = " WHERE " + whereCondition;
  }
  let orderBy =
    " ORDER BY " +
    param.orderByColumn +
    " " +
    param.orderBy +
    " NULLS LAST";
  let limitStart = (param.pageNum - 1) * param.pageSize;
  let limitEnd = param.pageSize;
  let limit = " limit " + limitStart + "," + limitEnd;
  const sqlSearchQuery = genFullSelectSQL(Object.assign({}, entity), tableName);
  sqlQuery += sqlSearchQuery;
  sqlQuery += whereCondition;
  sqlQuery += orderBy;
  sqlQuery += limit;
  let items = [];
  let queryRows = [];
  (await getDb()).exec({
    sql: sqlQuery,
    rowMode: "object",
    resultRows: queryRows,
  });
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

export async function searchCount(entity, tableName, param, whereConditionFunction) {
  let sqlCountSubTable = "";
  const sqlSearchQuery = genFullSelectSQL(Object.assign({}, entity), tableName);
  let whereCondition = "";
  whereCondition += whereConditionFunction(param);
  if (whereCondition.startsWith(" AND")) {
    whereCondition = whereCondition.replace("AND", "");
    whereCondition = " WHERE " + whereCondition;
  }
  sqlCountSubTable += sqlSearchQuery;
  sqlCountSubTable += whereCondition;
  //count
  let sqlCount = `SELECT COUNT(*) AS total FROM (${sqlCountSubTable}) AS t1`;
  let queryCountRows = [];
  (await getDb()).exec({
    sql: sqlCount,
    rowMode: "object",
    resultRows: queryCountRows,
  });
  return queryCountRows[0].total;
}

/**
 * 
 * @param {string[]} param ids
 */
export async function sort(tableName, idColumnName, param) {
  const now = new Date();
  const nowDatetimeString = dayjs(now).format("YYYY-MM-DD HH:mm:ss");
  if (param && param.length > 0) {
    param.forEach(async (id, index) => {
      (await getDb()).exec({
        sql: `UPDATE ${tableName} SET seq=$seq,update_datetime=$update_datetime WHERE ${idColumnName} = $id`,
        bind: {
          $seq: index,
          $id: id,
          $update_datetime: nowDatetimeString,
        },
      });
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
      postErrorMessage(message, "init sqlite3 error : " + e.message);
    }
    postSuccessMessage(message);
  },

  innerInit: async function () {
    return new Promise((resolve, reject) => {
      if (initializing) {
        resolve();
        return;
      }
      debugLog("Loading and initializing sqlite3 module...");
      let changelogList = [];
      changelogList.push(new ChangeLogV1());
      changelogList.push(new ChangeLogV2());
      changelogList.push(new ChangeLogV3());
      changelogList.push(new ChangeLogV4());
      changelogList.push(new ChangeLogV5());
      initChangeLog(changelogList);
      sqlite3InitModule({
        print: debugLog,
        printErr: infoLog,
      }).then(function (sqlite3) {
        debugLog("Done initializing. Running app...");
        if (!initializing) {
          try {
            initDb(sqlite3);
            initializing = true;
            resolve();
          } catch (e) {
            reject("init sqlite3 error : " + e.message);
          }
        } else {
          resolve();
        }
      });
    });
  },
  /**
   *
   * @param {*} message
   * @param { void } param
   */
  dbExport: async function (message, param) {
    try {
      let data = await capi.sqlite3_js_db_export(db);
      const zip = new JSZip();
      zip.file(JOB_DB_FILE_NAME, data);
      zip
        .generateAsync({
          compression: "DEFLATE",
          compressionOptions: { level: 9 },
          type: "uint8array",
        })
        .then(function (content) {
          postSuccessMessage(message, bytesToBase64(content));
        });
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
      const zip = new JSZip();
      let zipContent = await zip.loadAsync(base64ToBytes(param));
      let dbContent;
      try {
        dbContent = await zipContent.file(JOB_DB_FILE_NAME).async("uint8array");
      } catch (e) {
        postErrorMessage(message, "file: " + JOB_DB_FILE_NAME + " not found");
        return;
      }
      let bytesToWrite = await oo.OpfsDb.importDb(JOB_DB_FILE_NAME, dbContent);
      postSuccessMessage(message, bytesToWrite);
    } catch (e) {
      postErrorMessage(message, "[worker] dbExport error : " + e.message);
    }
  },
};

/**
 *
 * @param {Sqlite3Static} sqlite3
 * @returns
 */
const initDb = async function (sqlite3) {
  capi = sqlite3.capi; // C-style API
  oo = sqlite3.oo1; // High-level OO API
  debugLog(
    "SQLite3 version",
    capi.sqlite3_libversion(),
    capi.sqlite3_sourceid()
  );
  if ("OpfsDb" in oo) {
    db = new oo.OpfsDb(JOB_DB_PATH);
    debugLog("[DB] The OPFS is available.");
    debugLog("[DB] Persisted db =" + db.filename);
  } else {
    db = new oo.DB(JOB_DB_PATH, "ct");
    debugLog("[DB] The OPFS is not available.");
    debugLog("[DB] transient db =" + db.filename);
  }
  infoLog("[DB] schema checking...");
  let changelogList = getChangeLogList();
  let oldVersion = 0;
  let newVersion = changelogList.length;
  try {
    const SQL_SELECT_SCHEMA_COUNT =
      "SELECT COUNT(*) AS count FROM sqlite_schema;";
    let schemaCount = 0;
    let schemaCountRow = [];
    db.exec({
      sql: SQL_SELECT_SCHEMA_COUNT,
      rowMode: "object",
      resultRows: schemaCountRow,
    });
    if (schemaCountRow.length > 0) {
      schemaCount = schemaCountRow[0].count;
    }
    infoLog("[DB] current schemaCount = " + schemaCount);
    if (schemaCount == 0) {
      const SQL_PRAGMA_AUTO_VACUUM = "PRAGMA auto_vacuum = 1";
      db.exec(SQL_PRAGMA_AUTO_VACUUM);
      infoLog("[DB] execute " + SQL_PRAGMA_AUTO_VACUUM);
    }
  } catch (e) {
    errorLog("[DB] checking schema fail," + e.message);
    return;
  }
  try {
    db.exec({
      sql: "BEGIN TRANSACTION",
    });
    const SQL_CREATE_TABLE_VERSION = `
      CREATE TABLE IF NOT EXISTS version(
      num INTEGER
    )
      `;
    db.exec(SQL_CREATE_TABLE_VERSION);
    const SQL_QUERY_VERSION = "SELECT num FROM version";
    let rows = [];
    db.exec({
      sql: SQL_QUERY_VERSION,
      rowMode: "object",
      resultRows: rows,
    });
    if (rows.length > 0) {
      oldVersion = rows[0].num;
    } else {
      const SQL_INSERT_VERSION = `INSERT INTO version(num) values($num)`;
      db.exec({
        sql: SQL_INSERT_VERSION,
        bind: { $num: 0 },
      });
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
          db.exec(sql);
        }
      }
      const SQL_UPDATE_VERSION = `UPDATE version SET num = $num`;
      db.exec({
        sql: SQL_UPDATE_VERSION,
        bind: { $num: newVersion },
      });
      infoLog("[DB] schema upgrade finish to version = " + newVersion);
      infoLog("[DB] current schema version = " + newVersion);
    } else {
      infoLog("[DB] skip schema upgrade");
      infoLog("[DB] current schema version = " + oldVersion);
    }
    db.exec({
      sql: "COMMIT",
    });
  } catch (e) {
    errorLog("[DB] schema upgrade fail," + e.message);
    db.exec({
      sql: "ROLLBACK TRANSACTION",
    });
  }
};
