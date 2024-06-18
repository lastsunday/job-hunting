import { invoke, init } from "./bridge";

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
export async function httpFetchGetText(param,onReturnAbortHandlerCallbackFunction){
  let result = await invoke("httpFetchGetText", param,(message)=>{
    onReturnAbortHandlerCallbackFunction(()=>{
      httpFetchGetTextAbort(message.callbackId);
    })
  });
  return result.data;
}

/**
 * 中断网络请求
 * @param {string} param callbackId
 * @returns 
 */
export async function httpFetchGetTextAbort(param){
  await invoke("httpFetchGetTextAbort", param);
}