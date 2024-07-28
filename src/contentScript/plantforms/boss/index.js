import dayjs from "dayjs";
import {
  renderTimeTag,
  setupSortJobItem,
  renderSortJobItem,
  createLoadingDOM,
  hiddenLoadingDOM,
  finalRender,
  renderFunctionPanel,
} from "../../commonRender";
import { randomDelay } from "../../../common/utils";
import onlineFilter from "./onlineFilter";
import {
  JOB_STATUS_DESC_NEWEST,
  JOB_STATUS_DESC_RECRUITING,
  JOB_STATUS_DESC_UNKNOW,
} from "../../common";
import { PLATFORM_BOSS } from "../../../common";
import { saveBrowseJob, getJobIds } from "../../commonDataHandler";
import { JobApi } from "../../../common/api";

const DELAY_FETCH_TIME = 75; //ms
const DELAY_FETCH_TIME_RANDOM_OFFSET = 50; //ms

export function getBossData(responseText) {
  try {
    const data = JSON.parse(responseText);
    mutationContainer().then((node) => {
      setupSortJobItem(node);
      handleData(data?.zpData?.jobList || [], getListByNode(node), getJobItemDetailUrlFunction, 0);
      onlineFilter();
    });
    return;
  } catch (err) {
    console.error("解析 JSON 失败", err);
  }
}

// 获取职位列表节点
function getListByNode(node) {
  const children = node?.children;
  return function getListItem(index) {
    return children?.[index];
  };
}

// 监听 search-job-result 节点，判断职位列表是否被挂载
function mutationContainer() {
  return new Promise((resolve, reject) => {
    const dom = document.querySelector(".search-job-result");
    const observer = new MutationObserver(function (childList, obs) {
      (childList || []).forEach((item) => {
        const { addedNodes } = item;
        if (addedNodes && addedNodes.length > 0) {
          addedNodes.forEach((node) => {
            const { className } = node;
            if (className === "job-list-box") {
              observer.disconnect();
              resolve(node);
            }
          });
        }
      });
      return reject("未找到职位列表");
    });

    observer.observe(dom, {
      childList: true,
      subtree: false,
    });
  });
}

function convertJobStatusDesc(statusText) {
  if (statusText == JOB_STATUS_DESC_NEWEST.key) {
    return JOB_STATUS_DESC_NEWEST;
  } else if (statusText == JOB_STATUS_DESC_RECRUITING.key) {
    return JOB_STATUS_DESC_RECRUITING;
  } else {
    return JOB_STATUS_DESC_UNKNOW;
  }
}

function getJobItemDetailUrlFunction(dom) {
  return dom
    .querySelector(".job-card-body")
    .querySelector(".job-card-left").href;
}

// 解析数据，插入时间标签
export function handleData(list, getListItem, getJobItemDetailUrlFunction, orderStartIndex) {
  const apiUrlList = [];
  const urlList = [];
  list.forEach((item, index) => {
    const { brandName, securityId } = item;
    const dom = getListItem(index);
    //apiUrl
    let pureJobItemDetailApiUrl =
      "https://www.zhipin.com/wapi/zpgeek/job/detail.json?securityId=" +
      securityId;
    apiUrlList.push(pureJobItemDetailApiUrl);
    //jobUrl
    const jobItemDetailUrl = getJobItemDetailUrlFunction(dom);
    const url = new URL(jobItemDetailUrl);
    let pureJobItemDetailUrl = url.origin + url.pathname;
    urlList.push(pureJobItemDetailUrl);

    let loadingLastModifyTimeTag = createLoadingDOM(
      brandName,
      "__boss_time_tag"
    );
    dom.appendChild(loadingLastModifyTimeTag);
  });
  const promiseList = apiUrlList.map(async (url, index) => {
    await randomDelay(DELAY_FETCH_TIME * index, DELAY_FETCH_TIME_RANDOM_OFFSET); // 避免频繁请求触发风控
    const response = await fetch(url);
    const result = await response.json();
    return result;
  });
  Promise.allSettled(promiseList)
    .then(async (jsonList) => {
      let jobDTOList = [];
      jsonList.forEach((item, index) => {
        item.value.zpData.jobInfo.jobUrl = urlList[index];
      });
      await saveBrowseJob(jsonList, PLATFORM_BOSS);
      jobDTOList = await JobApi.getJobBrowseInfoByIds(
        getJobIds(jsonList, PLATFORM_BOSS)
      );
      const lastModifyTimeList = [];
      const jobStatusDescList = [];
      jsonList.forEach((item, index) => {
        lastModifyTimeList.push(
          dayjs(item.value?.zpData?.brandComInfo?.activeTime)
        );
        let jobStatus = convertJobStatusDesc(
          item.value?.zpData?.jobInfo?.jobStatusDesc
        );
        jobStatusDescList.push(jobStatus);
        //额外针对BOSS平台，为后面的排序做准备
        jobDTOList[index].jobStatusDesc = jobStatus;
        jobDTOList[
          index
        ].jobCompanyApiUrl = `https://www.zhipin.com/gongsi/${item.value?.zpData?.brandComInfo?.encryptBrandId}.html`;
        let hrActiveTimeDesc = item.value?.zpData?.bossInfo?.activeTimeDesc;
        //额外针对BOSS平台，为后面的排序做准备
        jobDTOList[index].hrActiveTimeDesc = hrActiveTimeDesc;
      });

      list.forEach((item, index) => {
        const dom = getListItem(index);
        let tag = createDOM(jobDTOList[index], jobStatusDescList[index]);
        dom.appendChild(tag);
      });
      hiddenLoadingDOM();
      renderSortJobItem(jobDTOList, getListItem, { platform: PLATFORM_BOSS, orderStartIndex });
      renderFunctionPanel(jobDTOList, getListItem, {
        platform: PLATFORM_BOSS,
        getCompanyInfoFunction: async function (url) {
          const response = await fetch(url);
          const result = await response.text();
          const MATCH_COMPANY = /企业名称：<\/span>(?<data>.*)<\/li>/;
          const groups = result.match(MATCH_COMPANY)?.groups;
          if (groups) {
            return groups["data"];
          } else {
            return null;
          }
        },
      });
      finalRender(jobDTOList, { platform: PLATFORM_BOSS });
    })
    .catch((error) => {
      console.log(error);
      hiddenLoadingDOM();
    });
}

function createDOM(jobDTO, jobStatusDesc) {
  const div = document.createElement("div");
  div.classList.add("__boss_time_tag");
  renderTimeTag(div, jobDTO, {
    jobStatusDesc: jobStatusDesc,
    platform: PLATFORM_BOSS,
  });
  return div;
}
