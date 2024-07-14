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
      if (response.status == 200) {
        const result = await response.text();
        postSuccessMessage(message, result);
      } else {
        let errorMessage = `statusCode = ${response.status}`;
        postErrorMessage(
          message,
          "[worker] httpFetchGetText error : " + errorMessage
        );
      }
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] httpFetchGetText error : " + e.message
      );
    }
  },

  /**
   * 
   * @param {*} message
   * @param {{url,method,headers,body}} param param
   */
  httpFetchJson: async function (message, param) {
    try {
      const controller = new AbortController();
      const signal = controller.signal;
      callbackIdAndAbortControllerMap.set(message.callbackId, controller);
      const response = await fetch(param.url, { signal, method: param.method, headers: param.headers, body: param.body });
      if (response.status == 200) {
        const result = await response.json();
        postSuccessMessage(message, result);
      } else {
        let errorMessage = `statusCode = ${response.status}`;
        postErrorMessage(
          message,
          "[worker] httpFetchJson error : " + errorMessage
        );
      }
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] httpFetchJson error : " + e.message
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
};
