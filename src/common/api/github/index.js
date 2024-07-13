import { AuthApi } from "../index"

const URL_GRAPHQL = "https://api.github.com/graphql";
const GITHUB_APP_REPO = "lastsunday/job-hunting-github-app";

export const GithubApi = {

  async queryComment({ first, after, last, before, id } = {}) {
    let data = genQueryCommentHQL({ first, after, last, before, id });
    let result = await fetchPost(URL_GRAPHQL, data);
    if(result.errors?.length > 0){
      throw result.errors;
    }else{
      return result?.data;
    }
  },

}

function genQueryCommentHQL({ first, after, last, before, id }) {
  //TODO set actual id
  let targetId = "";
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


async function fetchPost(url, data) {
  try {
    let oauthDTO = await AuthApi.authGetToken();
    let response = await fetch(url, {
      method: 'POST',
      headers: {
        "Authorization": `Bearer ${oauthDTO.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
    let status = response.status;
    if(status == 200){
      return await response.json();
    }else if(status = 401){
      //TODO refresh token
      //TODO 如果refresh token也过期，那么需要将token清除，重新登录
    }else{
      throw `unknown error,status code = ${status}`
    }
  } catch (e) {
    errorLog(e);
    throw e;
  }
}