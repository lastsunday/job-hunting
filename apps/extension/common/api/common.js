import { init, invoke } from "./bridge";
import { randomDelay } from "@/common/utils";
import { infoLog } from "../log";

export async function initBridge() {
  infoLog(`[Bridge] initBridge start`)
  init();
  await _initBridge();
  infoLog(`[Bridge] initBridge success`)
}

async function _initBridge() {
  try {
    await invoke("init", {});
  } catch (e) {
    //retry after delay
    await randomDelay(100, 0);
    await _initBridge();
  }
}

/**
 *
 * @returns base64 database file
 */
export async function dbExport() {
  let result = await invoke("dbExport", {});
  return result.data;
}

/**
 * @param {string} base64 zip file content
 * @returns bytesToWrite
 */
export async function dbImport(param) {
  let result = await invoke("dbImport", param);
  return result.data;
}

export async function dbDelete() {
  let result = await invoke("dbDelete", {});
  return result.data;
}

export async function dbSize() {
  let result = await invoke("dbSize", {});
  return result.data;
}

export async function dbSchemaVersion() {
  let result = await invoke("dbSchemaVersion", {});
  return result.data;
}

export async function dbGetAllTableName() {
  let result = await invoke("dbGetAllTableName", {});
  return result.data;
}

/**
 * 
 * @param {{sql:string}} param 
 * @returns Promise<{result:any}>
 */
export async function dbExec(param) {
  let result = await invoke("dbExec", param);
  return result.data;
}

/**
 * 提交网络请求
 * @param {string} param url
 * @param function onReturnAbortHandlerCallbackFunction 返回中断网络请求的函数
 * @returns text content
 */
export async function httpFetchGetText(
  param,
  onReturnAbortHandlerCallbackFunction
) {
  let result = await invoke("httpFetchGetText", param, {
    onMessageCallback: (message) => {
      onReturnAbortHandlerCallbackFunction(() => {
        httpFetchGetTextAbort(message.callbackId);
      });
    }
  });
  return result.data;
}

/**
 * 
 * @param {{url,method,headers,body}} param
 * @param function onReturnAbortHandlerCallbackFunction 返回中断网络请求的函数
 * @returns Object
 */
export async function httpFetchJson(
  param,
  onReturnAbortHandlerCallbackFunction
) {
  let result = await invoke("httpFetchJson", param, {
    onMessageCallback: (message) => {
      if (onReturnAbortHandlerCallbackFunction) {
        onReturnAbortHandlerCallbackFunction(() => {
          httpFetchGetTextAbort(message.callbackId);
        });
      }
    },
  });
  return result.data;
}

/**
 * 中断网络请求
 * @param {string} param callbackId
 * @returns
 */
export async function httpFetchGetTextAbort(param) {
  await invoke("httpFetchGetTextAbort", param);
}
