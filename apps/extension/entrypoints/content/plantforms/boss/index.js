import { PLATFORM_BOSS } from "../../../../common";
import { JobApi } from "../../../../common/api";
import { getAnalysisConfig, getJobIds, saveBrowseJob } from "../../commonDataHandler";
import {
  createLoadingDOM,
  finalRender,
  hiddenLoadingDOM,
  renderFunctionPanel,
  renderSortJobItem,
  renderTimeTag,
  setupSortJobItem,
  setErrorLoadingDOM,
} from "../../commonRender";
import onlineFilter from "./onlineFilter";

export function getBossData(responseText) {
  try {
    const data = JSON.parse(responseText);
    mutationContainer().then(async (node) => {
      setupSortJobItem(node);
      await handleData(data?.zpData?.jobList || [], getListByNode(node), getJobItemDetailUrlFunction, 0);
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
export async function handleData(list, getListItem, getJobItemDetailUrlFunction, orderStartIndex) {
  const cardApiUrlList = [];
  const urlList = [];
  list.forEach(async (item, index) => {
    const { brandName, securityId } = item;
    const dom = getListItem(index);
    //cardApiUrl
    const pureJobItemCardApiUrl =
      "https://www.zhipin.com/wapi/zpgeek/job/card.json?securityId=" +
      securityId;
    cardApiUrlList.push(pureJobItemCardApiUrl);
    //jobUrl
    const jobItemDetailUrl = getJobItemDetailUrlFunction(dom);
    const url = new URL(jobItemDetailUrl);
    const pureJobItemDetailUrl = url.origin + url.pathname;
    urlList.push(pureJobItemDetailUrl);

    const loadingLastModifyTimeTag = createLoadingDOM(
      brandName,
      "__boss_time_tag"
    );
    dom.appendChild(loadingLastModifyTimeTag);
  });
  try {
    list.forEach((item, index) => {
      item.jobUrl = urlList[index];
    });
    await saveBrowseJob(list, PLATFORM_BOSS);
    let jobDTOList = [];
    jobDTOList = await JobApi.getJobBrowseInfoByIds(
      getJobIds(list, PLATFORM_BOSS)
    );
    const analysisConfig = await getAnalysisConfig();
    list.forEach((item, index) => {
      const dom = getListItem(index);
      const tag = createDOM(jobDTOList[index], null, { analysisConfig });
      dom.appendChild(tag);
    });
    hiddenLoadingDOM();
    renderSortJobItem(jobDTOList, getListItem, { platform: PLATFORM_BOSS, orderStartIndex });
    await renderFunctionPanel(jobDTOList, getListItem, {
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
  } catch (error) {
    console.log(error);
    setErrorLoadingDOM(error)
  }
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
