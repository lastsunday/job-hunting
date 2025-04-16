import { PLATFORM_BOSS } from "../../../../common";
import { JobApi } from "../../../../common/api";
import { randomDelay } from "../../../../common/utils";
import { getAnalysisConfig, getJobIds, saveBrowseJob } from "../../commonDataHandler";
import {
  createLoadingDOM,
  finalRender,
  hiddenLoadingDOM,
  renderFunctionPanel,
  renderSortJobItem,
  renderTimeTag,
  setupSortJobItem,
  sortJobList,
} from "../../commonRender";
import onlineFilter from "./onlineFilter";

const DELAY_FETCH_TIME = 1000; //ms
const DELAY_FETCH_TIME_NO_LOGIN = 75; //ms
const DELAY_FETCH_TIME_RANDOM_OFFSET = 50; //ms
const BATCH_SIZE = 3; // 每批请求的数量
const BATCH_SIZE_NO_LOGIN = 1000; // 每批请求的数量

export function getBossData(responseText) {
  try {
    const data = JSON.parse(responseText);
    mutationContainer().then(async (node) => {
      setupSortJobItem(node);
      await handleData(data?.zpData?.jobList || [], getListByNode(node), getJobItemDetailUrlFunction, 0, {});
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

function getJobItemDetailUrlFunction(dom) {
  return dom
    .querySelector(".job-card-body")
    .querySelector(".job-card-left").href;
}

// 解析数据，插入时间标签
export async function handleData(list, getListItem, getJobItemDetailUrlFunction, orderStartIndex, { isRecommendPage }) {
  const isBossLogin = isLoggedIn();
  const delayFetchTime = isBossLogin ? DELAY_FETCH_TIME : DELAY_FETCH_TIME_NO_LOGIN;
  const batchSize = isBossLogin ? BATCH_SIZE : BATCH_SIZE_NO_LOGIN;
  list.forEach((item, index) => {
    const { brandName, securityId } = item;
    const dom = getListItem(index);
    item.dom = dom;
    //cardApiUrl
    const pureJobItemCardApiUrl =
      "https://www.zhipin.com/wapi/zpgeek/job/card.json?securityId=" +
      securityId;
    item.cardApiUrl = pureJobItemCardApiUrl;
    //jobUrl
    const jobItemDetailUrl = getJobItemDetailUrlFunction(dom);
    const url = new URL(jobItemDetailUrl);
    const pureJobItemDetailUrl = url.origin + url.pathname;
    item.jobUrl = pureJobItemDetailUrl;
    const loadingLastModifyTimeTag = createLoadingDOM(
      brandName,
      "__boss_time_tag"
    );
    dom.appendChild(loadingLastModifyTimeTag);
  });
  if (isBossLogin) {
    await saveBrowseJob(list, PLATFORM_BOSS);
    //TODO 登录状态下移除排序，避免一次性触发多次的数据分页拉取请求
    // const jobDTOList = await JobApi.getJobBrowseInfoByIds(
    //   getJobIds(list, PLATFORM_BOSS)
    // );
    // list.forEach((item, index) => {
    //   if (item.bossOnline) {
    //     item.hrActiveTimeDesc = "刚刚活跃";
    //   }
    //   item.createDatetime = jobDTOList[index].createDatetime;
    // });
    // renderSortJobItem(list, getListItem, { platform: PLATFORM_BOSS, isRecommendPage });
    // list = sortJobList(list, { platform: PLATFORM_BOSS });
  }
  let totalJobDTOList = [];
  const cardApiUrlList = list.map(item => item.cardApiUrl);
  // 分批请求数据
  const fetchBatchData = async (batchIndex, isFinalFetch) => {
    const start = batchIndex * batchSize;
    const end = Math.min(start + batchSize, cardApiUrlList.length);
    const batchUrls = cardApiUrlList.slice(start, end);

    const promiseList = batchUrls.map(async (url, index) => {
      await randomDelay(delayFetchTime * index, DELAY_FETCH_TIME_RANDOM_OFFSET); // 避免频繁请求触发风控
      const response = await fetch(url);
      const result = await response.json();
      return Object.assign(result.zpData.jobCard, list[start + index]);
    });

    const response = await Promise.allSettled(promiseList);
    const jsonList = response.map(item => item.value);
    let jobDTOList = [];
    await saveBrowseJob(jsonList, PLATFORM_BOSS);
    jobDTOList = await JobApi.getJobBrowseInfoByIds(
      getJobIds(jsonList, PLATFORM_BOSS)
    );
    // const lastModifyTimeList = [];
    const jobStatusDescList = [];
    jsonList.forEach((item, index) => {
      //TODO 字段接口被删除
      // lastModifyTimeList.push(
      //   dayjs(item.value?.zpData?.brandComInfo?.activeTime)
      // );
      //TODO json.detail接口限流窗口过小
      // let jobStatus = convertJobStatusDesc(
      //   item.value?.zpData?.jobInfo?.jobStatusDesc
      // );
      jobStatusDescList.push(null);
      // 额外针对BOSS平台，为后面的排序做准备
      // jobDTOList[index].jobStatusDesc = null;
      jobDTOList[
        index
      ].jobCompanyApiUrl = `https://www.zhipin.com/gongsi/${item.encryptBrandId}.html`;
      const hrActiveTimeDesc = item.activeTimeDesc;
      //额外针对BOSS平台，为后面的排序做准备
      jobDTOList[index].hrActiveTimeDesc = hrActiveTimeDesc;
      jobDTOList[index].dom = item.dom;
    });

    const analysisConfig = await getAnalysisConfig();
    jsonList.forEach((item, index) => {
      const dom = item.dom;
      const tag = createDOM(jobDTOList[index], jobStatusDescList[index], { analysisConfig });
      dom.appendChild(tag);
    });

    await renderFunctionPanel(
      jobDTOList,
      (index, item) => item.dom,
      {
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
        isRecommendPage
      }
    );
    finalRender(jobDTOList, { platform: PLATFORM_BOSS, isFinalRender: isFinalFetch, isRecommendPage });
    totalJobDTOList = totalJobDTOList.concat(jobDTOList);
  };

  // 逐批请求并处理数据
  const totalBatches = Math.ceil(cardApiUrlList.length / batchSize);
  (async () => {
    for (let i = 0; i < totalBatches; i++) {
      await fetchBatchData(i, i === totalBatches - 1);
    }
    if (!isRecommendPage && !isBossLogin) {
      renderSortJobItem(totalJobDTOList, getListItem, { platform: PLATFORM_BOSS, orderStartIndex, isRecommendPage });
    }
    hiddenLoadingDOM();
  })().catch((error) => {
    console.log(error);
    hiddenLoadingDOM();
  });
}

function createDOM(jobDTO, jobStatusDesc, { analysisConfig }) {
  const div = document.createElement("div");
  div.classList.add("__boss_time_tag");
  renderTimeTag(div, jobDTO, {
    jobStatusDesc: jobStatusDesc,
    platform: PLATFORM_BOSS,
    analysisConfig
  });
  return div;
}

function isLoggedInByCookie(cookieName) {
  const cookies = document.cookie;
  const cookieArray = cookies.split(';');
  for (let i = 0; i < cookieArray.length; i++) {
    const cookie = cookieArray[i].trim();
    if (cookie.startsWith(cookieName + '=')) {
      return true;
    }
  }
  return false;
}

function isLoggedIn() {
  const cookieCheck = isLoggedInByCookie('bst'); // 猜测为 boss token
  return cookieCheck;
}