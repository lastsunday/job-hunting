import {
  GITHUB_URL_GET_USER, GITHUB_URL_GET_ACCESS_TOKEN, GITHUB_APP_CLIENT_ID,
  GITHUB_APP_CLIENT_SECRET, URL_GRAPHQL, GITHUB_APP_REPO, URL_POST_ISSUES,
  URL_TRAFFIC_CLONE, URL_TRAFFIC_POPULAR_PATHS, URL_TRAFFIC_POPULAR_REFERRERS, URL_TRAFFIC_VIEWS,
  APP_URL_LATEST_VERSION, GITHUB_URL_API
} from "../../config";
import { AuthApi, DeveloperApi } from "../index"
import { UserDTO } from "../../data/dto/userDTO";
import { OauthDTO } from "../../data/dto/oauthDTO";
import { infoLog, errorLog } from "../../log";
import { httpFetchJson } from "../../api/common";
import { parseToLineObjectToToHumpObject } from "../../../common/utils";

export const EXCEPTION = {
  NO_LOGIN: "NO_LOGIN",
  NOT_FOUND: "NOT_FOUND",
  NO_PERMISSION: "NO_PERMISSION",
  CREATION_FAILED: "CREATION_FAILED",
}

export const GithubApi = {

  async queryComment({ first, after, last, before, id } = {}) {
    let data = genQueryCommentHQL({ first, after, last, before, id });
    let result = await fetchJson(`${URL_GRAPHQL}?t=${new Date().getTime()}`, data);
    if (result.errors?.length > 0) {
      throw result.errors;
    } else {
      return result?.data;
    }
  },

  async queryRepository({ first, after, last, before, repo } = {}) {
    let data = genQueryRepositoryHQL({ first, after, last, before, repo });
    let result = await fetchJson(`${URL_GRAPHQL}?t=${new Date().getTime()}`, data);
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
  },

  async listIssueComment(issueNumber, { pageSize, pageNum } = { pageSize: 2, pageNum: 1 }) {
    let commentListObject = await fetchJson(`${URL_POST_ISSUES}/${issueNumber}/comments?per_page=${pageSize}&page=${pageNum}&t=${new Date().getTime()}`, null, {
      method: "GET", responseHeaderCallback: (jsonResult, headers) => {
        let result = {};
        result.items = jsonResult;
        let urls = headers.get("Link")?.split(",");
        const { url: nextUrl, pageNum: nextPageNum } = getUrlAndPageNum(urls, "next");
        result.nextUrl = nextUrl;
        result.nextPageNum = nextPageNum;
        const { url: prevUrl, pageNum: prevPageNum } = getUrlAndPageNum(urls, "prev");
        result.prevUrl = prevUrl;
        result.prevPageNum = prevPageNum;
        const { url: lastUrl, pageNum: lastPageNum } = getUrlAndPageNum(urls, "last");
        result.lastUrl = lastUrl;
        result.lastPageNum = lastPageNum;
        const { url: firstUrl, pageNum: firstPageNum } = getUrlAndPageNum(urls, "first");
        result.firstUrl = firstUrl;
        result.firstPageNum = firstPageNum;
        return result;
      }
    });
    return commentListObject;
  },

  async createIssueComment(issueNumber, data) {
    await fetchJson(`${URL_POST_ISSUES}/${issueNumber}/comments`, { "body": data });
  },

  async getTrafficClone() {
    let token = await getDeveloperToken();
    let result = await fetchJsonWithToken(`${URL_TRAFFIC_CLONE}?t=${new Date().getTime()}`, null, { method: "GET", token })
    result.items = result.clones;
    delete result.clones;
    return result;
  },

  async getTrafficPopularPaths() {
    let token = await getDeveloperToken();
    let result = await fetchJsonWithToken(`${URL_TRAFFIC_POPULAR_PATHS}?t=${new Date().getTime()}`, null, { method: "GET", token })
    result.forEach(item => {
      item.url = `https://github.com${item.path}`;
      delete item.path;
    });
    return result;
  },

  async getTrafficPopularReferrers() {
    let token = await getDeveloperToken();
    let result = await fetchJsonWithToken(`${URL_TRAFFIC_POPULAR_REFERRERS}?t=${new Date().getTime()}`, null, { method: "GET", token })
    result.forEach(item => {
      item.url = `http://${item.referrer}`;
      item.title = `${item.referrer}`
      delete item.referrer;
    });
    return result;
  },

  async getTrafficViews() {
    let token = await getDeveloperToken();
    let result = await fetchJsonWithToken(`${URL_TRAFFIC_VIEWS}?t=${new Date().getTime()}`, null, { method: "GET", token })
    result.items = result.views;
    delete result.views;
    return result;
  },

  async queryVersion() {
    return await fetchJson(APP_URL_LATEST_VERSION, null, { method: "GET", skipLogin: true });
  },
  async getRepo(owner, repo, { getTokenFunction, setTokenFunction }) {
    return await fetchJson(`${GITHUB_URL_API}/repos/${owner}/${repo}`, null, { method: "GET", getTokenFunction, setTokenFunction });
  },
  /**
   * 新建仓库
   * @param {*} repo 仓库名
   * @param {*} param
   * @returns 
   */
  async newRepo(repo, { getTokenFunction, setTokenFunction }) {
    return await fetchJson(`${GITHUB_URL_API}/user/repos`, { "name": repo }, { method: "POST", getTokenFunction, setTokenFunction });
  },
  async createFileContent(owner, repo, path, base64Data, msg, { getTokenFunction, setTokenFunction }) {
    return await fetchJson(`${GITHUB_URL_API}/repos/${owner}/${repo}/contents${path}`, { "message": msg, "content": base64Data }, { method: "PUT", getTokenFunction, setTokenFunction });
  },
  async listRepoContents(owner, repo, path, { getTokenFunction, setTokenFunction }) {
    return await fetchJson(`${GITHUB_URL_API}/repos/${owner}/${repo}/contents${path}`, null, { method: "GET", getTokenFunction, setTokenFunction });
  },
}

async function getDeveloperToken() {
  return await DeveloperApi.developerGetToken();
}

function getUrlAndPageNum(urls, keyword) {
  let url = null;
  let pageNum = null;
  if (urls && urls.length > 0) {
    let filterUrls = urls.filter(item => { return item.includes(`rel=\"${keyword}\"`) });
    if (filterUrls && filterUrls.length > 0) {
      url = filterUrls[0].match(/<(?<url>.*)>/).groups.url;
    }
  }
  if (url) {
    pageNum = Number.parseInt(new URL(url).searchParams.get("page"));
  }
  return { url, pageNum }
}

function genQueryRepositoryHQL({ first, after, last, before,repo }) {
  return {
    query: `
    {
      search(query:"${repo} in:name sort:updated-desc",type:REPOSITORY,first: ${first ?? null}, after: ${after ? "\"" + after + "\"" : null},last:${last ?? null},before:${before ? "\"" + before + "\"" : null}) {
        nodes{
          ... on Repository{
            id
            owner{
              login
              avatarUrl
            }
            name
            createdAt
            updatedAt
            stargazerCount
          }
        }
        pageInfo {
            endCursor
            startCursor
            hasNextPage
            hasPreviousPage
          }
        repositoryCount
      }
    }
    `
  };
}

function genQueryCommentHQL({ first, after, last, before, id }) {
  let targetId = id;
  return {
    query: `
    {
        search(query:"${targetId} in:title sort:updated-desc is:issue is:open repo:${GITHUB_APP_REPO}", type: ISSUE, first: ${first ?? null}, after: ${after ? "\"" + after + "\"" : null},last:${last ?? null},before:${before ? "\"" + before + "\"" : null}){
          nodes{
            ... on Issue{
              id
              number
              title
              bodyUrl
              author{
                avatarUrl
                login
              }
              createdAt
              lastEditedAt
              bodyText
              bodyHTML
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

async function fetchJson(url, data, { method, responseHeaderCallback, skipLogin, getTokenFunction, setTokenFunction } = { method: "POST", skipLogin: false }) {
  try {
    let oauthDTO = null;
    if (getTokenFunction) {
      oauthDTO = await getTokenFunction();
    } else {
      oauthDTO = await AuthApi.authGetToken();
    }
    if (!oauthDTO && !skipLogin) {
      throw EXCEPTION.NO_LOGIN;
    }
    let response = await fetchJsonReturnResponse(url, data, { method, skipLogin, getTokenFunction });
    let status = response.status;
    if (isStatusNoError(response)) {
      const jsonResult = await response.json();
      if (responseHeaderCallback) {
        return responseHeaderCallback(jsonResult, response.headers);
      }
      return jsonResult;
    } else if (status == 401 && oauthDTO?.refreshToken) {
      infoLog("start refresh token");
      //遇到401和拥有refresh token时，进行refresh token
      let refreshTokenUrl = `${GITHUB_URL_GET_ACCESS_TOKEN}?client_id=${GITHUB_APP_CLIENT_ID}&client_secret=${GITHUB_APP_CLIENT_SECRET}&grant_type=refresh_token&refresh_token=${oauthDTO.refreshToken}`;
      try {
        let refreshTokenJson = null;
        try {
          let response = (await fetch(
            refreshTokenUrl, {
            headers: {
              "Accept": "application/json"
            }
          },
          ));
          if (response.status == 200) {
            refreshTokenJson = await response.json();
          } else {
            throw `unknown status = ${response.status}`;
          }
        } catch (e) {
          infoLog("get refresh token error")
          throw e;
        }
        infoLog("get refresh token response");
        //refresh token
        if (refreshTokenJson.error) {
          infoLog("refresh token error");
          //refresh token也过期，那么需要将token清除，重新登录
          if (setTokenFunction) {
            await setTokenFunction(null);
          } else {
            await AuthApi.authSetToken(null);
          }
          throw `${refreshTokenJson.error_description}`
        } else {
          infoLog("refresh token success");
          let afterRefreshOauthDTO = parseToLineObjectToToHumpObject(new OauthDTO(), refreshTokenJson);
          if (setTokenFunction) {
            await setTokenFunction(afterRefreshOauthDTO);
          } else {
            await AuthApi.authSetToken(afterRefreshOauthDTO);
          }
          infoLog("continue request");
          //再次发出请求
          response = await fetchJsonReturnResponse(url, data, { method, getTokenFunction });
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
    } else if (status == 403) {
      throw EXCEPTION.NO_PERMISSION;
    } else if (status == 404) {
      throw EXCEPTION.NOT_FOUND;
    } else if (status == 422) {
      throw EXCEPTION.CREATION_FAILED;
    } else {
      throw `unknown error,status code = ${status}`
    }
  } catch (e) {
    throw e;
  }
}

async function fetchJsonWithToken(url, data, { method, token, responseHeaderCallback }) {
  let response = await fetchJsonReturnResponse(url, data, { method, token });
  let status = response.status;
  if (isStatusNoError(response)) {
    const jsonResult = await response.json();
    if (responseHeaderCallback) {
      return responseHeaderCallback(jsonResult, response.headers);
    }
    return jsonResult;
  } else {
    throw `unknown error,status code = ${status}`
  }
}

async function fetchJsonReturnResponse(url, data, { method, token, skipLogin, getTokenFunction } = { method: "POST", skipLogin: false }) {
  let targetToken = token;
  if (!targetToken) {
    let oauthDTO = null;
    if (getTokenFunction) {
      oauthDTO = await getTokenFunction();
    } else {
      oauthDTO = await AuthApi.authGetToken();
    }
    targetToken = oauthDTO?.accessToken;
  }
  if (!targetToken && !skipLogin) {
    throw EXCEPTION.NO_LOGIN;
  }
  let headers = {
    "Content-Type": "application/json",
  };
  if (targetToken) {
    headers["Authorization"] = `Bearer ${targetToken}`;
  }
  let option = {
    method,
    headers,
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