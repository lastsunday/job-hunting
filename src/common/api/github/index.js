import { GITHUB_URL_GET_USER, GITHUB_URL_GET_ACCESS_TOKEN, GITHUB_APP_CLIENT_ID, GITHUB_APP_CLIENT_SECRET } from "../../config";
import { AuthApi } from "../index"
import { UserDTO } from "../../data/dto/userDTO";
import { OauthDTO } from "../../data/dto/oauthDTO";
import { infoLog, errorLog } from "../../log";
import { httpFetchJson } from "../../api/common";
import { parseToLineObjectToToHumpObject } from "../../../common/utils";

const URL_GRAPHQL = "https://api.github.com/graphql";
const GITHUB_APP_REPO = "lastsunday/job-hunting-github-app";

const URL_POST_ISSUES = "https://api.github.com/repos/lastsunday/job-hunting-github-app/issues";

export const GithubApi = {

  async queryComment({ first, after, last, before, id } = {}) {
    let data = genQueryCommentHQL({ first, after, last, before, id });
    let result = await fetchJson(URL_GRAPHQL, data);
    if (result.errors?.length > 0) {
      throw result.errors;
    } else {
      return result?.data;
    }
  },

  async addComment(title, body) {
    await fetchJson(URL_POST_ISSUES, {
      title, body
    });
    return;
  },

  /**
   * 
   * @returns UserDTO
   */
  async getUser() {
    let userObject = await fetchJson(GITHUB_URL_GET_USER, null, { method: "GET" });
    let userDTO = parseToLineObjectToToHumpObject(new UserDTO(), userObject);
    return userDTO;
  }

}

function genQueryCommentHQL({ first, after, last, before, id }) {
  let targetId = id;
  return {
    query: `
    {
        search(query:"${targetId} in:title sort:updated-desc is:issue repo:${GITHUB_APP_REPO}", type: ISSUE, first: ${first ?? null}, after: ${after ?? null},last:${last ?? null},before:${before ?? null}){
          nodes{
            ... on Issue{
              title
              bodyUrl
              author{
                avatarUrl
                login
              }
              createdAt
              lastEditedAt
              bodyText
            }
          }
          issueCount
          pageInfo {
            endCursor
            startCursor
            hasNextPage
            hasPreviousPage
          }
          }
        }
    `
  };
}

async function fetchJson(url, data, { method } = { method: "POST" }) {
  try {
    let oauthDTO = await AuthApi.authGetToken();
    let response = await fetchJsonReturnResponse(url, data, { method });
    let status = response.status;
    if (isStatusNoError(response)) {
      return await response.json();
    } else if (status = 401 && oauthDTO?.refreshToken) {
      infoLog("start refresh token");
      //遇到401和拥有refresh token时，进行refresh token
      let refreshTokenUrl = `${GITHUB_URL_GET_ACCESS_TOKEN}?client_id=${GITHUB_APP_CLIENT_ID}&client_secret=${GITHUB_APP_CLIENT_SECRET}&grant_type=refresh_token&refresh_token=${oauthDTO.refreshToken}`;
      try {
        let refreshTokenJson = null;
        try {
          refreshTokenJson = await httpFetchJson({
            url: refreshTokenUrl, headers: {
              "Accept": "application/json"
            }
          });
        } catch (e) {
          infoLog("get refresh token error")
          throw e;
        }
        infoLog("get refresh token response");
        //refresh token
        if (refreshTokenJson.error) {
          infoLog("refresh token error");
          //refresh token也过期，那么需要将token清除，重新登录
          AuthApi.authSetToken(null);
          throw `${refreshTokenJson.error_description}`
        } else {
          infoLog("refresh token success");
          let afterRefreshOauthDTO = parseToLineObjectToToHumpObject(new OauthDTO(), refreshTokenJson);
          await AuthApi.authSetToken(afterRefreshOauthDTO);
          infoLog("continue request");
          //再次发出请求
          response = await fetchJsonReturnResponse(url, data, { method });
          if (isStatusNoError(response)) {
            return await response.json();
          } else {
            infoLog("continue error");
            throw `unknown error,status code = ${response.status}`
          }
        }
      } catch (e) {
        throw e;
      }
    } else {
      throw `unknown error,status code = ${status}`
    }
  } catch (e) {
    errorLog(e);
    throw e;
  }
}

async function fetchJsonReturnResponse(url, data, { method } = { method: "POST" }) {
  let oauthDTO = await AuthApi.authGetToken();
  let option = {
    method,
    headers: {
      "Authorization": `Bearer ${oauthDTO.accessToken}`,
      "Content-Type": "application/json"
    },
  };
  if (data) {
    option.body = JSON.stringify(data);
  }
  let response = await fetch(url, option);
  return response;
}

function isStatusNoError(response) {
  return response.status == 200 || response.status == 201;
}