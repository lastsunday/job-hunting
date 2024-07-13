import { invoke, init } from "./bridge";
import { CONTENT_SCRIPT } from "./bridgeCommon";

export async function initBridge() {
  init();
  await invoke("init", {});
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

/**
 * 提交网络请求
 * @param {string} param url
 * @param function onReturnAbortHandlerCallbackFunction 返回中断网络请求的函数
 * @returns text content
 */
export async function httpFetchGetText(
  param,
  onReturnAbortHandlerCallbackFunction,
  { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }
) {
  let result = await invoke("httpFetchGetText", param, {
    onMessageCallback: (message) => {
      onReturnAbortHandlerCallbackFunction(() => {
        httpFetchGetTextAbort(message.callbackId);
      });
    },
    invokeEnv: invokeEnv,
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
  onReturnAbortHandlerCallbackFunction,
  { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }
) {
  let result = await invoke("httpFetchJson", param, {
    onMessageCallback: (message) => {
      if (onReturnAbortHandlerCallbackFunction) {
        onReturnAbortHandlerCallbackFunction(() => {
          httpFetchGetTextAbort(message.callbackId);
        });
      }
    },
    invokeEnv: invokeEnv,
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
