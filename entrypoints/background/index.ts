import { onMessageHandle, postErrorMessage, postSuccessMessage } from "@/common/extension/background/util";
import useService from "@/common/extension/hooks/service";
import { AppApi, JobApi } from "../../common/api";
import {
  BACKGROUND
} from "../../common/api/bridgeCommon";
import { httpFetchGetText, httpFetchJson } from "../../common/api/common";
import { GITHUB_APP_CLIENT_ID, GITHUB_APP_CLIENT_SECRET, GITHUB_APP_INSTALL_CALLBACK_URL, GITHUB_URL_GET_ACCESS_TOKEN, GITHUB_URL_GET_USER, TASK_LOOP_DELAY } from "../../common/config";
import { OauthDTO } from "../../common/data/dto/oauthDTO";
import { UserDTO } from "../../common/data/dto/userDTO";
import { debugLog, errorLog, infoLog } from "../../common/log";
import { convertPureJobDetailUrl, paramsToObject, parseToLineObjectToToHumpObject, randomDelay } from "../../common/utils";
import { AuthService, getOauth2LoginMessageMap, getToken, setToken } from "./service/authService";
import { AutomateService } from "./service/automateService";
import { EmitterService } from "./service/emitterService";
import { SystemService } from "./service/systemService";
import { setUser, UserService } from "./service/userService";

export default defineBackground(() => {
  debugLog("background ready");
  chrome.runtime.onInstalled.addListener(async () => {
    debugLog("updateDynamicRules ready");
    //https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest
    const rules: chrome.declarativeNetRequest.Rule[] = [{
      id: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
        requestHeaders: [{
          header: 'Referer',
          operation: chrome.declarativeNetRequest.HeaderOperation.SET,
          value: 'https://creditbj.jxj.beijing.gov.cn/credit-portal/credit_service/publicity/record/black',
        }],
      },
      condition: {
        initiatorDomains: [chrome.runtime.id],
        urlFilter: '|https://creditbj.jxj.beijing.gov.cn/credit-portal/api/publicity/record/BLACK/0',
        resourceTypes: [chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST],
      },
    }];
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: rules.map(r => r.id),
      addRules: rules,
    });
    debugLog("updateDynamicRules end");
  });
  debugLog("keepAlive start");
  //see https://stackoverflow.com/questions/66618136/persistent-service-worker-in-chrome-extension
  const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20e3);
  chrome.runtime.onStartup.addListener(keepAlive);
  keepAlive();

  chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({
      url: "admin.html",
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
          let tokenText = await httpFetchGetText(urlWithParam, (abortFunction) => { })
          let tokenURLSearchParam = new URLSearchParams(tokenText);
          const tokenObject = paramsToObject(tokenURLSearchParam);
          let oauthDTO = parseToLineObjectToToHumpObject(new OauthDTO(), tokenObject);
          await setToken(oauthDTO);
          let userResultJson = await httpFetchJson({
            url: GITHUB_URL_GET_USER, headers: {
              "Authorization": `Bearer ${oauthDTO.accessToken}`,
            }
          }, (abortFunction) => { });
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
        let job = await JobApi.getJobByDetailUrl(pureUrl);
        if (job) {
          infoLog(`save jobBrowseDetailHistory start jobId = ${job.jobId}`);
          await JobApi.addJobBrowseDetailHistory(job.jobId);
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

  const { mergeServiceMethod } = useService();

  mergeServiceMethod(ACTION_FUNCTION, AuthService)
  mergeServiceMethod(ACTION_FUNCTION, UserService);
  mergeServiceMethod(ACTION_FUNCTION, SystemService);
  mergeServiceMethod(ACTION_FUNCTION, AutomateService);
  mergeServiceMethod(ACTION_FUNCTION, EmitterService);

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
        justification: "To run database in web worker",
      });
      await creating;
      creating = null;
      //
      let taskRunCount = 0;
      let taskRun = false;
      const backgroundTaskRunning = async () => {
        if (!taskRun) {
          taskRun = true;
          try {
            taskRunCount += 1;
            infoLog(`[Task] Task run seq = < ${taskRunCount} >`)
            await AppApi.appBackgroundTaskRun({});
          } catch (e) {
            errorLog(e);
          }
          taskRun = false;
          await randomDelay(TASK_LOOP_DELAY, 0);
          backgroundTaskRunning();
        }
      };
      backgroundTaskRunning();
    }

    chrome.runtime.onMessage.addListener(async function (
      message,
      sender,
      sendResponse
    ) {
      onMessageHandle(message, sender, ACTION_FUNCTION);
    });
  }

  setupOffscreenDocument("offscreen.html");
});
