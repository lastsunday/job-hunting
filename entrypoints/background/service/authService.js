import { postErrorMessage, postSuccessMessage } from "@/common/extension/background/util";
import { ConfigApi } from "../../../common/api";
import {
  BACKGROUND,
} from "../../../common/api/bridgeCommon";
import { GITHUB_APP_CLIENT_ID, GITHUB_URL_APP_INSTALL_AUTHORIZE, GITHUB_URL_AUTHORIZE, KEY_GITHUB_OAUTH_TOKEN } from "../../../common/config";
import { Config } from "../../../common/data/domain/config";
import { OauthDTO } from "../../../common/data/dto/oauthDTO";

const oauth2LoginMessageMap = new Map();

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
   * authInstallAndLogin
   * @param {*} message
   * @param {string} param url
   * 
   * @return OauthDTO
   */
  authInstallAndLogin: async function (message, param) {
    try {
      chrome.tabs.create({
        url: `${GITHUB_URL_APP_INSTALL_AUTHORIZE}`,
      });
      oauth2LoginMessageMap.set(message);
      //other method handle post callback
    } catch (e) {
      postErrorMessage(
        message,
        "[background] authInstallAndLogin error : " + e.message
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
        "[background] authGetToken error : " + e.message
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
        "[background] authSetToken error : " + e.message
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
  return ConfigApi.addOrUpdateConfig(config);
}

/**
 * 
 * @returns OauthDTO
 */
export async function getToken() {
  let oauthDTO = new OauthDTO();
  let config = await ConfigApi.getConfigByKey(KEY_GITHUB_OAUTH_TOKEN);
  if (config) {
    let value = JSON.parse(config.value);
    if (value) {
      Object.assign(oauthDTO, value);
      return oauthDTO;
    }
  }
  return null;
}



