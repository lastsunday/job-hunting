import { postSuccessMessage, postErrorMessage } from "../util";
import { OauthDTO } from "../../common/data/dto/oauthDTO";
import { ConfigApi } from "../../common/api";
import { Config } from "../../common/data/domain/config";
import { GITHUB_APP_CLIENT_ID, GITHUB_URL_AUTHORIZE } from "../../common/config";
import {
  BACKGROUND,
} from "../../common/api/bridgeCommon";

const oauth2LoginMessageMap = new Map();

const KEY_GITHUB_OAUTH_TOKEN = "KEY_GITHUB_OAUTH_TOKEN";

export const AuthService = {
  /**
   * oauth2 Login
   * @param {*} message
   * @param {string} param url
   * 
   * @return OauthDTO
   */
  authOauth2Login: async function (message, param) {
    try {
      chrome.tabs.create({
        url: `${GITHUB_URL_AUTHORIZE}?client_id=${GITHUB_APP_CLIENT_ID}`,
      });
      oauth2LoginMessageMap.set(message);
      //other method handle post callback
    } catch (e) {
      postErrorMessage(
        message,
        "[background] authOauth2Login error : " + e.message
      );
    }
  },
  /**
   * @param {*} message
   * @param {void} param 
   * 
   * @return OauthDTO
   */
  authGetToken: async function (message, param) {
    try {
      postSuccessMessage(message, await getToken());
    } catch (e) {
      postErrorMessage(
        message,
        "[background] authOauth2Login error : " + e.message
      );
    }
  },
  /**
   * @param {*} message
   * @param {OauthDTO} param oauthDTO
   */
  authSetToken: async function (message, param) {
    try {
      await setToken(param);
      postSuccessMessage(message, {});
    } catch (e) {
      postErrorMessage(
        message,
        "[background] authOauth2Login error : " + e.message
      );
    }
  },
};

export function getOauth2LoginMessageMap() {
  return oauth2LoginMessageMap;
}

/**
 * 
 * @param {OauthDTO} token 
 */
export async function setToken(token) {
  let config = new Config();
  config.key = KEY_GITHUB_OAUTH_TOKEN;
  config.value = JSON.stringify(token);
  return ConfigApi.addOrUpdateConfig(config, { invokeEnv: BACKGROUND });
}

/**
 * 
 * @returns OauthDTO
 */
export async function getToken() {
  let oauthDTO = new OauthDTO();
  let config = await ConfigApi.getConfigByKey(KEY_GITHUB_OAUTH_TOKEN, { invokeEnv: BACKGROUND });
  if (config) {
    Object.assign(oauthDTO, JSON.parse(config.value));
  }
  return oauthDTO;
}



