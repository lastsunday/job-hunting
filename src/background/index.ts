import { infoLog, debugLog, errorLog } from "../common/log";
import {
  BACKGROUND,
  CONTENT_SCRIPT,
  OFFSCREEN,
} from "../common/api/bridgeCommon";
import { convertPureJobDetailUrl, paramsToObject, parseToLineObjectToToHumpObject } from "../common/utils";
import { JobApi } from "../common/api";
import { httpFetchGetText, httpFetchJson } from "../common/api/common";
import { getAndRemovePromiseHook } from "../common/api/bridge";
import { AuthService, getOauth2LoginMessageMap, setToken, getToken } from "./service/authService";
import { postSuccessMessage, postErrorMessage } from "./util";
import { OauthDTO } from "../common/data/dto/oauthDTO";
import { GITHUB_APP_CLIENT_ID, GITHUB_APP_CLIENT_SECRET, GITHUB_URL_GET_ACCESS_TOKEN, GITHUB_URL_GET_USER, GITHUB_APP_INSTALL_CALLBACK_URL } from "../common/config";
import { UserService } from "./service/userService";
import { UserDTO } from "../common/data/dto/userDTO";
import { setUser } from "./service/userService";

debugLog("background ready");
debugLog("keepAlive start");
//see https://stackoverflow.com/questions/66618136/persistent-service-worker-in-chrome-extension
const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20e3);
chrome.runtime.onStartup.addListener(keepAlive);
keepAlive();

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: "src/sidepanel/index.html",
  });
});

//TODO 没有定时清理，可能会有问题
const saveBrowseDetailTabIdMap = new Map();
const saveInstallUrlMap = new Map();

//detect job detail access
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  let urlText = tab.url;
  if (urlText?.startsWith(GITHUB_APP_INSTALL_CALLBACK_URL) && !isSavedByInstallUrl(urlText)) {
    let oauth2LoginMessageMap = getOauth2LoginMessageMap();
    recordSavedInstallUrl(urlText);
    let url = new URL(urlText);
    let result = "";
    if (url.searchParams.has("error")) {
      //错误，如果有error
      result = "error";
      oauth2LoginMessageMap.keys().forEach(message => {
        postErrorMessage(message, "error");
      });
      oauth2LoginMessageMap.clear();
    } else {
      //获取到code，访问https://github.com/login/oauth/access_token获取access_token和refresh_token
      let code = url.searchParams.get("code");
      try {
        const searchParams = new URLSearchParams({
          client_id: GITHUB_APP_CLIENT_ID,
          client_secret: GITHUB_APP_CLIENT_SECRET,
          code,
        });
        let urlWithParam = `${GITHUB_URL_GET_ACCESS_TOKEN}?${searchParams.toString()}`;
        let tokenText = await httpFetchGetText(urlWithParam, (abortFunction) => { }, { invokeEnv: BACKGROUND })
        let tokenURLSearchParam = new URLSearchParams(tokenText);
        const tokenObject = paramsToObject(tokenURLSearchParam);
        let oauthDTO = parseToLineObjectToToHumpObject(new OauthDTO(), tokenObject);
        await setToken(oauthDTO);
        let userResultJson = await httpFetchJson({
          url: GITHUB_URL_GET_USER, headers: {
            "Authorization": `Bearer ${oauthDTO.accessToken}`,
          }
        }, (abortFunction) => { }, { invokeEnv: BACKGROUND });
        let userDTO = parseToLineObjectToToHumpObject(new UserDTO(), userResultJson);
        await setUser(userDTO);
        let targetToken = await getToken();
        oauth2LoginMessageMap.keys().forEach(message => {
          postSuccessMessage(message, targetToken);
        });
        chrome.tabs.remove(tabId);
        oauth2LoginMessageMap.clear();
      } catch (e) {
        errorLog(e);
        oauth2LoginMessageMap.keys().forEach(message => {
          postErrorMessage(message, "error");
        });
      }
    }
    return;
  }
  if (changeInfo?.status == "complete" && !isSavedByTabId(tab.id)) {
    if (tab.url) {
      let pureUrl = convertPureJobDetailUrl(tab.url);
      let job = await JobApi.getJobByDetailUrl(pureUrl, {
        invokeEnv: BACKGROUND,
      });
      if (job) {
        infoLog(`save jobBrowseDetailHistory start jobId = ${job.jobId}`);
        await JobApi.addJobBrowseDetailHistory(job.jobId, {
          invokeEnv: BACKGROUND,
        });
        infoLog(`save jobBrowseDetailHistory success jobId = ${job.jobId}`);
        recordSavedByTabId(tab.id);
      }
    }
  }
});

function isSavedByInstallUrl(url) {
  return saveInstallUrlMap.has(url);
}

function recordSavedInstallUrl(url) {
  saveInstallUrlMap.set(url, null);
}

function isSavedByTabId(tabId) {
  return saveBrowseDetailTabIdMap.has(tabId);
}

function recordSavedByTabId(tabId) {
  saveBrowseDetailTabIdMap.set(tabId, null);
}

const ACTION_FUNCTION = new Map();

function mergeServiceMethod(actionFunction, source) {
  let keys = Object.keys(source);
  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    actionFunction.set(key, source[key]);
  }
}

mergeServiceMethod(ACTION_FUNCTION, AuthService)
mergeServiceMethod(ACTION_FUNCTION, UserService);

let creating: any;
async function setupOffscreenDocument(path: string) {
  // Check all windows controlled by the service worker to see if one
  // of them is the offscreen document with the given path
  if (await chrome.offscreen.hasDocument?.()) return;

  // create offscreen document
  if (creating) {
    await creating;
  } else {
    creating = chrome.offscreen.createDocument({
      url: chrome.runtime.getURL(path),
      reasons: [
        chrome.offscreen.Reason.WORKERS || chrome.offscreen.Reason.BLOBS,
      ],
      justification: "To run web worker to run sqlite",
    });
    await creating;
    creating = null;
  }

  chrome.runtime.onMessage.addListener(async function (
    message,
    sender,
    sendResponse
  ) {
    if (message) {
      if (message.from == CONTENT_SCRIPT && message.to == BACKGROUND) {
        //get the tab id from content script page,not the extension page(eg: sidepanel)
        if (sender.tab) {
          message.tabId = sender.tab.id;
        }
        debugLog(
          "2.[background][receive][" +
          message.from +
          " -> " +
          message.to +
          "] message [action=" +
          message.action +
          ",invokeEnv=" +
          message.invokeEnv +
          ",callbackId=" +
          message.callbackId +
          ",error=" +
          message.error +
          "]"
        );
        let action = message.action;
        if (ACTION_FUNCTION.has(action)) {
          debugLog("[background] invoke action = " + action);
          ACTION_FUNCTION.get(action)(message, message.param);
        } else {
          message.from = BACKGROUND;
          message.to = OFFSCREEN;
          debugLog(
            "3.[background][send][" +
            message.from +
            " -> " +
            message.to +
            "] message [action=" +
            message.action +
            ",invokeEnv=" +
            message.invokeEnv +
            ",callbackId=" +
            message.callbackId +
            ",error=" +
            message.error +
            "]"
          );
          chrome.runtime.sendMessage(message);
        }
      } else if (message.from == OFFSCREEN && message.to == BACKGROUND) {
        debugLog(
          "10.[background][receive][" +
          message.from +
          " -> " +
          message.to +
          "] message [action=" +
          message.action +
          ",invokeEnv=" +
          message.invokeEnv +
          ",callbackId=" +
          message.callbackId +
          ",error=" +
          message.error +
          "]"
        );
        if (message.invokeEnv == CONTENT_SCRIPT) {
          message.from = BACKGROUND;
          message.to = CONTENT_SCRIPT;
          debugLog(
            "11.[background][send][" +
            message.from +
            " -> " +
            message.to +
            "] message [action=" +
            message.action +
            ",invokeEnv=" +
            message.invokeEnv +
            ",callbackId=" +
            message.callbackId +
            ",error=" +
            message.error +
            "]"
          );
          if (message.tabId) {
            //content script invoke
            chrome.tabs.sendMessage(message.tabId, message);
          } else {
            //other invoke
            //Note that extensions cannot send messages to content scripts using this method. To send messages to content scripts, use tabs.sendMessage.
            chrome.runtime.sendMessage(message);
          }
        } else if (message.invokeEnv == BACKGROUND) {
          let promiseHook = getAndRemovePromiseHook(message.callbackId);
          if (promiseHook) {
            if (message.error) {
              message.message = message.error;
              promiseHook.reject(message);
            } else {
              promiseHook.resolve(message);
            }
          } else {
            errorLog(
              `callbackId = ${message.callbackId} lost callback promiseHook`
            );
          }
        }
      }
    }
  });
}

setupOffscreenDocument("src/offscreen/offscreen.html");
