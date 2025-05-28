import {
  TASK_TYPE_AND_FILE_NAME_MAP
} from "@/common";
import { _fetch as githubFetch, EXCEPTION } from "@/common/api/github";
import { GITHUB_URL } from "@/common/config";
import { lsTree, sparseCheckout } from "@/common/git";
import { parse } from "@/common/utils/date";
import dayjs from "dayjs";
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'; // ES 2015
dayjs.extend(isSameOrAfter);

export async function queryRepoFileDateList({
  userName, repoName, taskType,
  getPathMap = async ({ userName, repoName }) => {
    return await lsTree({
      url: `${GITHUB_URL}/${userName}/${repoName}`,
      ref: "HEAD",
      getResponseAsyncFunction: async ({ url, method, headers, body }) => {
        return githubFetch(url, { method, headers, body, authMode: "Basic" });
      }
    })
  } }) {
  if (TASK_TYPE_AND_FILE_NAME_MAP.has(taskType)) {
    const pathMap = await getPathMap({ userName, repoName });
    const fileName = TASK_TYPE_AND_FILE_NAME_MAP.get(taskType);
    const pathKeys = pathMap.keys();
    const filterResult = [];
    pathKeys.forEach(path => {
      const matchPath = path.match(new RegExp(`\\/(?<YYYY>[0-9]{4})\\/(?<MM>[0-1][0-9])-(?<DD>[0-3][0-9])\\/${fileName}\\..*`));
      if (matchPath) {
        const { YYYY, MM, DD } = matchPath.groups;
        filterResult.push(parse(`${YYYY}-${MM}-${DD}`));
      }
    });
    return filterResult;
  } else {
    throw `can't find file name by task type = ${taskType}`;
  }
}

export function filterAndSortAscDateList({ dateList, targetDay, retentionDay }) {
  let result = dateList.filter(item => { return item.isSameOrAfter(targetDay.subtract(retentionDay, 'day')) })
  return result.sort((a1, a2) => { return a1.valueOf() - a2.valueOf() });
}

export async function getFileData({
  userName, repoName, filePath,
  getResponseAsyncFunction
} = {}) {
  return getFileDataByUrl({ url: `${GITHUB_URL}/${userName}/${repoName}`, filePath, getResponseAsyncFunction }
  )
}

export async function getFileDataByUrl({
  url, filePath,
  getResponseAsyncFunction = async ({ url, method, headers, body }) => {
    return githubFetch(url, { method, headers, body, authMode: "Basic" });
  }
} = {}) {
  const result = await sparseCheckout(`${url}`, `HEAD`, [filePath], {
    getResponseAsyncFunction
  });
  let keys = Object.keys(result);
  if (keys.includes(filePath)) {
    return result[filePath];
  } else {
    throw EXCEPTION.NOT_FOUND;
  }
}
