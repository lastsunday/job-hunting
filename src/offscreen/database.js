import { infoLog, debugLog, errorLog } from "../common/log";
import sqlite3InitModule from "@sqlite.org/sqlite-wasm";
import { ChangeLogV1 } from "./changeLog/changeLogV1";
import { ChangeLogV2 } from "./changeLog/changeLogV2";
import { initChangeLog, getChangeLogList } from "./changeLog";
import { bytesToBase64, base64ToBytes } from "../common/utils/base64.js";
import JSZip from "jszip";
import { postSuccessMessage, postErrorMessage } from "./util";
import { toHump } from "../common/utils";

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
