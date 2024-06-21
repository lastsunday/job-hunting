import { postSuccessMessage, postErrorMessage } from "../util";

const callbackIdAndAbortControllerMap = new Map();

export const NetworkService = {
    /**
   * 提交网络请求
   * @param {*} message
   * @param {string} param url
   */
  httpFetchGetText: async function (message, param) {
    try {
      const controller = new AbortController();
      const signal = controller.signal;
      callbackIdAndAbortControllerMap.set(message.callbackId, controller);
      const response = await fetch(param, { signal });
      const result = await response.text();
      postSuccessMessage(message, result);
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] httpFetchGetText error : " + e.message
      );
    }
  },

  /**
   *中断网络请求
   * @param {*} message
   * @param {string} param callbackId
   */
  httpFetchGetTextAbort: async function (message, param) {
    try {
      let controller = callbackIdAndAbortControllerMap.get(param);
      callbackIdAndAbortControllerMap.delete(param);
      controller.abort("user abort");
      postSuccessMessage(message, {});
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] httpFetchGetTextAbort error : " + e.message
      );
    }
  },
}