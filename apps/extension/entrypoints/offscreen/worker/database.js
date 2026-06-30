import {
  postErrorMessage,
  postSuccessMessage,
} from '@/common/extension/worker/util';
import { debugLog, errorLog, infoLog, isDebug } from '@/common/log';
import { convertEmptyStringToNull, toHump, toLine } from '@/common/utils';
import dayjs from 'dayjs';
import { getChangeLogList, initChangeLog } from './changeLog';
import { ChangeLogV1 } from './changeLog/changeLogV1';
import { ChangeLogV10 } from './changeLog/changeLogV10';
import { ChangeLogV11 } from './changeLog/changeLogV11';
import { ChangeLogV12 } from './changeLog/changeLogV12';
import { ChangeLogV13 } from './changeLog/changeLogV13';
import { ChangeLogV14 } from './changeLog/changeLogV14';
import { ChangeLogV15 } from './changeLog/changeLogV15';
import { ChangeLogV16 } from './changeLog/changeLogV16';
import { ChangeLogV2 } from './changeLog/changeLogV2';
import { ChangeLogV3 } from './changeLog/changeLogV3';
import { ChangeLogV4 } from './changeLog/changeLogV4';
import { ChangeLogV5 } from './changeLog/changeLogV5';
import { ChangeLogV6 } from './changeLog/changeLogV6';
import { ChangeLogV7 } from './changeLog/changeLogV7';
import { ChangeLogV8 } from './changeLog/changeLogV8';
import { ChangeLogV9 } from './changeLog/changeLogV9';

import { isDevEnv } from '@/common';
import { ENABLE_SQL_AUTO_EXPLAIN } from '@/common/config';
import { PGlite } from '@electric-sql/pglite';
import { auto_explain } from '@electric-sql/pglite/contrib/auto_explain';
import { pgDump } from '@electric-sql/pglite-tools/pg_dump';
import { zipFileToBlob, unzipAdvanceFileToText } from '@/common/zip';
import { connectionManager } from './connectionManager';

const DATA_DIR = 'data';
const JOB_DIR = 'job';
const JOB_DB_PATH = '/' + DATA_DIR + '/' + JOB_DIR + '/';
const DUMP_FILE_NAME = 'db.sql';

const changelogList = [
  new ChangeLogV1(),
  new ChangeLogV2(),
  new ChangeLogV3(),
  new ChangeLogV4(),
  new ChangeLogV5(),
  new ChangeLogV6(),
  new ChangeLogV7(),
  new ChangeLogV8(),
  new ChangeLogV9(),
  new ChangeLogV10(),
  new ChangeLogV11(),
  new ChangeLogV12(),
  new ChangeLogV13(),
  new ChangeLogV14(),
  new ChangeLogV15(),
  new ChangeLogV16(),
];
initChangeLog(changelogList);

let dataDir = `opfs-ahp://${JOB_DB_PATH}`;

connectionManager.setInitHandler(async () => {
  return initDb({ dataDir });
});

export async function getDb({ dataDir: overrideDir } = {}) {
  if (overrideDir) {
    dataDir = overrideDir;
  }
  return connectionManager.getDb();
}

export async function getOne(sql, bind, obj, { connection = null } = {}) {
  connection ??= await getDb();
  let resultItem = null;
  const { rows } = await connection.query(sql, bind);
  if (rows.length > 0) {
    const item = rows[0];
    resultItem = obj;
    const keys = Object.keys(item);
    for (let n = 0; n < keys.length; n++) {
      const key = keys[n];
      resultItem[toHump(key)] = item[key];
    }
  }
  return resultItem;
}

export async function getAll(sql, bind, obj, { connection = null } = {}) {
  connection ??= await getDb();
  const { rows } = await connection.query(sql, bind);
  const result = [];
  if (rows.length > 0) {
    for (let i = 0; i < rows.length; i++) {
      const item = rows[i];
      const resultItem = Object.assign({}, obj);
      const keys = Object.keys(item);
      for (let n = 0; n < keys.length; n++) {
        const key = keys[n];
        resultItem[toHump(key)] = item[key];
      }
      result.push(resultItem);
    }
  }
  return result;
}

export function genFullSelectSQL(obj, tableName) {
  const column = [];
  const keys = Object.keys(obj);
  for (let n = 0; n < keys.length; n++) {
    const key = keys[n];
    column.push(toLine(key));
  }
  return `SELECT ${column.join(',')} FROM ${tableName}`;
}

export function genFullSelectByIdSQL(obj, tableName, idColumnName, id) {
  return `${genFullSelectSQL(obj, tableName)} WHERE ${idColumnName} = '${id}'`;
}

export async function batchInsert(
  obj,
  tableName,
  params,
  {
    overrideCreateDatetime = false,
    overrideUpdateDatetime = false,
    connection = null,
  } = {}
) {
  return batchInsertOrReplace(obj, tableName, null, params, {
    replace: false,
    overrideCreateDatetime,
    overrideUpdateDatetime,
    connection,
  });
}

export async function batchInsertOrReplace(
  obj,
  tableName,
  tableIdColumn,
  params,
  {
    replace = true,
    overrideCreateDatetime = false,
    overrideUpdateDatetime = false,
    connection = null,
  } = {}
) {
  connection ??= await getDb();
  if (params && params.length > 0) {
    //https://www.sqlite.org/limits.html
    //Maximum Number Of Host Parameters In A Single SQL Statement
    //To prevent excessive memory allocations, the maximum value of a host parameter number is SQLITE_MAX_VARIABLE_NUMBER, which defaults to 999 for SQLite versions prior to 3.32.0 (2020-05-22) or 32766 for SQLite versions after 3.32.0.
    //在PGlite里暂时先借用该规则，这数值不一定合理。
    const maxVarLength = 32766;
    const paramVarLength = Object.keys(obj).length;
    const maxRecordCountForOneExec = Number.parseInt(
      maxVarLength / paramVarLength
    );
    const recordTotal = params.length;
    let count = Number.parseInt(recordTotal / maxRecordCountForOneExec);
    const modCount = recordTotal % maxRecordCountForOneExec;
    if (modCount > 0) {
      count = count + 1;
    }
    for (let i = 0; i < count; i++) {
      const start = i * maxRecordCountForOneExec;
      let end = (i + 1) * maxRecordCountForOneExec;
      if (i == count - 1) {
        //last index
        end = recordTotal;
      }
      const rangeParam = params.slice(start, end);
      const batchInsertOrReplaceSQL = genRawBatchFullInsertOrReplaceSQL(
        obj,
        tableName,
        tableIdColumn,
        rangeParam,
        { replace, overrideCreateDatetime }
      );
      if (isDebug()) {
        debugLog(
          `[database] [batchInsertOrReplace] batchInsertOrReplaceSQL = ${batchInsertOrReplaceSQL}`
        );
      }
      const bindValue = genInsertValueBindValue(obj, rangeParam, {
        overrideCreateDatetime,
        overrideUpdateDatetime,
      });
      await connection.query(batchInsertOrReplaceSQL, bindValue);
    }
  }
}

export function genRawBatchFullInsertOrReplaceSQL(
  obj,
  tableName,
  tableIdColumn,
  params,
  { replace = true, overrideCreateDatetime = false } = {}
) {
  const column = [];
  const keys = Object.keys(obj);
  for (let n = 0; n < keys.length; n++) {
    const key = keys[n];
    column.push(toLine(key));
  }
  const valuesSql = genInsertValueSQL(obj, params);
  const updateSql = replace
    ? genUpdateValueSQL(obj, tableIdColumn, { overrideCreateDatetime })
    : '';
  return `INSERT INTO ${tableName} (${column.join(
    ','
  )}) VALUES ${valuesSql} ${updateSql}`;
}

function genUpdateValueSQL(
  obj,
  tableIdColumn,
  { overrideCreateDatetime = false } = {}
) {
  const updateColumns = [];
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const key = toLine(keys[i]);
    if (key != 'create_datetime' || overrideCreateDatetime) {
      updateColumns.push(`${toLine(key)} = EXCLUDED.${key}`);
    }
  }
  return `ON CONFLICT (${tableIdColumn}) DO UPDATE SET ${updateColumns.join(
    ','
  )}`;
}

function genInsertValueBindValue(
  obj,
  params,
  { overrideCreateDatetime = false, overrideUpdateDatetime = false } = {}
) {
  const now = new Date();
  const values = [];
  const keys = Object.keys(obj);
  for (let i = 0; i < params.length; i++) {
    const param = params[i];
    for (let n = 0; n < keys.length; n++) {
      const key = keys[n];
      if (key == 'createDatetime') {
        if (overrideCreateDatetime && param[`${key}`]) {
          values.push(`${dayjs(param[`${key}` ?? now]).format()}`);
        } else {
          values.push(`${dayjs(now).format()}`);
        }
      } else if (key == 'updateDatetime') {
        if (overrideUpdateDatetime && param[`${key}`]) {
          values.push(`${dayjs(param[`${key}` ?? now]).format()}`);
        } else {
          values.push(`${dayjs(now).format()}`);
        }
      } else if (param[`${key}`] && typeof param[`${key}`] == 'object') {
        values.push(JSON.stringify(param[`${key}`]));
      } else {
        const value = convertEmptyStringToNull(param[`${key}`]);
        values.push(value);
      }
    }
  }
  return values;
}

function genInsertValueSQL(obj, params) {
  const insertValues = [];
  for (let i = 0; i < params.length; i++) {
    const values = [];
    const keys = Object.keys(obj);
    for (let n = 0; n < keys.length; n++) {
      values.push(`$${i * keys.length + n + 1}`);
    }
    insertValues.push(`(${values.join(',')})`);
  }
  return insertValues.join(',');
}

export async function one(
  entity,
  tableName,
  idColumn,
  id,
  { connection = null } = {}
) {
  const selectOneSql = genFullSelectByIdSQL(entity, tableName, idColumn, id);
  if (isDebug()) {
    debugLog(`[database] [one] selectOneSql = ${selectOneSql}`);
  }
  return await getOne(selectOneSql, [], entity, { connection });
}

export async function all(
  entity,
  tableName,
  orderBy,
  { connection = null } = {}
) {
  let selectAllSql = genFullSelectSQL(entity, tableName);
  if (orderBy) {
    selectAllSql += ` ORDER BY ${orderBy}`;
  }
  if (isDebug()) {
    debugLog(`[database] [all] selectAllSql = ${selectAllSql}`);
  }
  return getAll(selectAllSql, [], entity, { connection });
}

export async function batchGet(
  obj,
  tableName,
  idColumnName,
  ids,
  { connection = null } = {}
) {
  connection ??= await getDb();
  if (ids.length == 0) {
    return [];
  }
  const batchGetSql = genFullSelectByIdsSQL(obj, tableName, idColumnName, ids);
  if (isDebug()) {
    debugLog(`[database] [batchGet] batchGetSql = ${batchGetSql}`);
  }
  const { rows } = await connection.query(batchGetSql);
  return convertRows(rows);
}

export function genFullSelectByIdsSQL(obj, tableName, idColumnName, ids) {
  const idsString = "'" + ids.join("','") + "'";
  return `${genFullSelectSQL(
    obj,
    tableName
  )} WHERE ${idColumnName} in (${idsString})`;
}

export async function del(
  tableName,
  idColumn,
  id,
  { otherCondition = null, connection = null } = {}
) {
  connection ??= await getDb();
  const deleteSql = `DELETE FROM ${tableName} WHERE ${idColumn} = '${id}' ${
    otherCondition ? 'AND ' + otherCondition : ''
  }`;
  if (isDebug()) {
    debugLog(`[database] [del] deleteSql = ${deleteSql}`);
  }
  return await connection.exec(deleteSql);
}

export async function batchDel(
  tableName,
  idColumn,
  ids,
  { otherCondition = null, connection = null } = {}
) {
  connection ??= await getDb();
  const idsString = "'" + ids.join("','") + "'";
  const deleteSql = `DELETE FROM ${tableName} WHERE ${idColumn} in (${idsString}) ${
    otherCondition ? 'AND ' + otherCondition : ''
  }`;
  if (isDebug()) {
    debugLog(`[database] [batchDel] deleteSql = ${deleteSql}`);
  }
  return await connection.exec(deleteSql);
}

export async function search(
  entity,
  tableName,
  param,
  whereConditionFunction,
  { connection = null } = {}
) {
  connection ??= await getDb();
  let sqlQuery = '';
  let whereCondition = '';
  if (whereConditionFunction) {
    whereCondition += whereConditionFunction(param);
  }
  if (whereCondition.startsWith(' AND')) {
    whereCondition = whereCondition.replace('AND', '');
    whereCondition = ' WHERE ' + whereCondition;
  }
  let orderBy = '';
  if (param.orderByColumn != null && param.orderBy != null) {
    orderBy =
      ' ORDER BY ' +
      toLine(param.orderByColumn) +
      ' ' +
      param.orderBy +
      ' NULLS LAST';
  }
  let limit = '';
  if (param.pageNum != null && param.pageSize != null) {
    const limitStart = (param.pageNum - 1) * param.pageSize;
    const limitEnd = param.pageSize;
    limit = ' limit ' + limitEnd + ' OFFSET ' + limitStart;
  }
  const sqlSearchQuery = genFullSelectSQL(Object.assign({}, entity), tableName);
  sqlQuery += sqlSearchQuery;
  sqlQuery += whereCondition;
  sqlQuery += orderBy;
  sqlQuery += limit;
  const items = [];
  const { rows: queryRows } = await connection.query(sqlQuery);
  for (let i = 0; i < queryRows.length; i++) {
    const resultItem = Object.assign({}, entity);
    const item = queryRows[i];
    const keys = Object.keys(item);
    for (let n = 0; n < keys.length; n++) {
      const key = keys[n];
      resultItem[toHump(key)] = item[key];
    }
    items.push(resultItem);
  }
  return items;
}

export async function searchCount(
  entity,
  tableName,
  param,
  whereConditionFunction,
  { connection = null } = {}
) {
  connection ??= await getDb();
  let sqlCountSubTable = '';
  const sqlSearchQuery = genFullSelectSQL(Object.assign({}, entity), tableName);
  let whereCondition = '';
  if (whereConditionFunction) {
    whereCondition += whereConditionFunction(param);
  }
  if (whereCondition.startsWith(' AND')) {
    whereCondition = whereCondition.replace('AND', '');
    whereCondition = ' WHERE ' + whereCondition;
  }
  sqlCountSubTable += sqlSearchQuery;
  sqlCountSubTable += whereCondition;
  //count
  const sqlCount = `SELECT COUNT(*) AS total FROM (${sqlCountSubTable}) AS t1`;
  const { rows } = await connection.query(sqlCount);
  const total = rows[0].total;
  return total;
}

/**
 *
 * @param {string[]} param ids
 */
export async function sort(
  tableName,
  idColumnName,
  param,
  { connection = null } = {}
) {
  const now = new Date();
  const nowDatetimeString = dayjs(now).format();
  connection ??= await getDb();
  if (param && param.length > 0) {
    for (let i = 0; i < param.length; i++) {
      await connection.query(
        `UPDATE ${tableName} SET seq=$1,update_datetime=$2 WHERE ${idColumnName} = $3`,
        [i, nowDatetimeString, param[i]]
      );
    }
  }
}

export const Database = {
  init: async function (message, param) {
    try {
      if (param?.dataDir) {
        dataDir = param.dataDir;
      }
      await connectionManager.getDb();
      postSuccessMessage(message);
    } catch (e) {
      postErrorMessage(message, 'init database error : ' + e.message);
    }
  },

  dbExport: async function (message, param) {
    try {
      const file = await pgDump({ pg: await getDb() });
      postSuccessMessage(
        message,
        URL.createObjectURL(await zipFileToBlob(DUMP_FILE_NAME, file))
      );
    } catch (e) {
      postErrorMessage(message, '[worker] dbExport error : ' + e.message);
    }
  },

  dbImport: async function (message, param) {
    try {
      const blob = await fetch(param).then((r) => r.blob());
      const sqlText = await unzipAdvanceFileToText({
        fileName: DUMP_FILE_NAME,
        file: blob,
      });
      await _dbDelete();
      const restoredPG = await PGlite.create(`opfs-ahp://${JOB_DB_PATH}`);
      await restoredPG.exec(sqlText);
      await connectionManager.adoptDb(restoredPG);
      postSuccessMessage(message, {});
    } catch (e) {
      postErrorMessage(message, '[worker] dbImport error : ' + e.message);
    }
  },

  dbClose: async function (message, param) {
    try {
      await connectionManager.close();
      postSuccessMessage(message, {});
    } catch (e) {
      postErrorMessage(message, '[worker] dbClose error : ' + e.message);
    }
  },

  dbDelete: async function (message, param) {
    try {
      await _dbDelete();
      postSuccessMessage(message, {});
    } catch (e) {
      postErrorMessage(message, '[worker] dbDelete error : ' + e.message);
    }
  },

  dbSize: async function (message, param) {
    try {
      const sql = `SELECT SUM(t1.pg_relation_size) AS total FROM (SELECT PG_RELATION_SIZE(relid) FROM pg_stat_user_tables) AS t1`;
      const { rows } = await (await getDb()).query(sql);
      const total = rows[0].total;
      postSuccessMessage(message, { total });
    } catch (e) {
      postErrorMessage(message, '[worker] dbSize error : ' + e.message);
    }
  },

  dbSchemaVersion: async function (message, param) {
    try {
      const sql = `SELECT num FROM version;`;
      const { rows } = await (await getDb()).query(sql);
      const version = rows[0].num;
      postSuccessMessage(message, { version });
    } catch (e) {
      postErrorMessage(
        message,
        '[worker] dbSchemaVersion error : ' + e.message
      );
    }
  },

  dbExec: async function (message, param) {
    try {
      const sql = param.sql;
      const { rows, fields, affectedRows } = await (await getDb()).query(sql);
      postSuccessMessage(message, { result: { rows, fields, affectedRows } });
    } catch (e) {
      postErrorMessage(message, '[worker] dbExec error : ' + e.message);
    }
  },

  dbGetAllTableName: async function (message, param) {
    try {
      const sql = `select tablename as name from pg_tables where schemaname = 'public'`;
      const { rows: result } = await (await getDb()).query(sql);
      postSuccessMessage(message, { result });
    } catch (e) {
      postErrorMessage(
        message,
        '[worker] dbGetAllTableName error : ' + e.message
      );
    }
  },
};

const _dbDelete = async () => {
  await connectionManager.close();
  connectionManager.enterRecoveryMode();
  const root = await navigator.storage.getDirectory();
  const fileHandle = await root.getDirectoryHandle(DATA_DIR);
  await fileHandle.removeEntry(JOB_DIR, { recursive: true });
};

/**
 *
 * @returns
 */
const initDb = async function ({ dataDir = `opfs-ahp://${JOB_DB_PATH}` } = {}) {
  let db;
  if (isDevEnv() && ENABLE_SQL_AUTO_EXPLAIN) {
    db = new PGlite(dataDir, {
      extensions: { auto_explain },
      debug: 1,
    });
    await db.exec(`
      LOAD 'auto_explain';
      SET auto_explain.log_min_duration = '0';
      SET auto_explain.log_analyze = 'true';
      `);
  } else {
    db = new PGlite(dataDir);
  }
  infoLog('[DB] schema checking...');
  const changelogList = getChangeLogList();
  let oldVersion = 0;
  const newVersion = changelogList.length;
  try {
    await db.transaction(async (tx) => {
      const SQL_CREATE_TABLE_VERSION = `
          CREATE TABLE IF NOT EXISTS version(
          num INTEGER
        )
      `;
      await tx.exec(SQL_CREATE_TABLE_VERSION);
      const SQL_QUERY_VERSION = 'SELECT num FROM version';
      const result = await tx.query(SQL_QUERY_VERSION);
      const rows = result.rows;
      if (rows.length > 0) {
        oldVersion = rows[0].num;
      } else {
        const SQL_INSERT_VERSION = `INSERT INTO version(num) values($1)`;
        await tx.query(SQL_INSERT_VERSION, [0]);
      }
      infoLog(
        '[DB] schema oldVersion = ' +
          oldVersion +
          ', newVersion = ' +
          newVersion
      );
      if (newVersion > oldVersion) {
        infoLog('[DB] schema upgrade start');
        for (let i = oldVersion; i < newVersion; i++) {
          const currentVersion = i + 1;
          const changelog = changelogList[i];
          const sqlList = changelog.getSqlList();
          infoLog(
            '[DB] schema upgrade changelog version = ' +
              currentVersion +
              ', sql total = ' +
              sqlList.length
          );
          for (let seq = 0; seq < sqlList.length; seq++) {
            infoLog(
              '[DB] schema upgrade changelog version = ' +
                currentVersion +
                ', execute sql = ' +
                (seq + 1) +
                '/' +
                sqlList.length
            );
            const sql = sqlList[seq];
            await tx.exec(sql);
          }
        }
        const SQL_UPDATE_VERSION = `UPDATE version SET num = $1`;
        await tx.query(SQL_UPDATE_VERSION, [newVersion]);
        infoLog('[DB] schema upgrade finish to version = ' + newVersion);
        infoLog('[DB] current schema version = ' + newVersion);
      } else {
        infoLog('[DB] skip schema upgrade');
        infoLog('[DB] current schema version = ' + oldVersion);
      }
    });
  } catch (e) {
    errorLog('[DB] schema upgrade fail,' + e.message);
    await db.close();
    throw e;
  }
  return db;
};

export function convertRows(rows) {
  const result = [];
  if (rows.length > 0) {
    const keys = Object.keys(rows[0]);
    rows.forEach((item) => {
      const obj = {};
      keys.forEach((key) => {
        obj[toHump(key)] = item[key];
      });
      result.push(obj);
    });
  }
  return result;
}
