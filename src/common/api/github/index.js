import { AuthApi } from "../index"
import { UserDTO } from "../../data/dto/userDTO";
import { GITHUB_URL_GET_USER } from "../../config";

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
    let response = await fetch(url, {
      method,
      headers: {
        "Authorization": `Bearer ${oauthDTO.accessToken}`,
        "Content-Type": "application/json"
      },
      body: data ? JSON.stringify(data) : null
    });
    let status = response.status;
    if (status == 200 || status == 201) {
      return await response.json();
    } else if (status = 401) {
      //TODO refresh token
      //TODO 如果refresh token也过期，那么需要将token清除，重新登录
    } else {
      throw `unknown error,status code = ${status}`
    }
  } catch (e) {
    errorLog(e);
    throw e;
  }
}