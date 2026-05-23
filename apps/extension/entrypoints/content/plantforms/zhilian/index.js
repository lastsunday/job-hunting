import { PLATFORM_ZHILIAN } from "../../../../common";
import { JobApi } from "../../../../common/api";
import { getJobIds, saveBrowseJob, getAnalysisConfig } from "../../commonDataHandler";
import {
  createLoadingDOM,
  finalRender,
  hiddenLoadingDOM,
  renderFunctionPanel,
  renderSortJobItem,
  renderTimeTag,
  setupSortJobItem
} from "../../commonRender";
// const DELAY_FETCH_TIME = 75; //ms
// const DELAY_FETCH_TIME_RANDOM_OFFSET = 50; //ms

export function getZhiLianData(responseText) {
  try {
    const data = JSON.parse(responseText);
    mutationContainer().then((node) => {
      setupSortJobItem(node);
      parseZhilianData(data?.data?.list || [], getListByNode(node));
    });
  } catch (err) {
    console.error("解析 JSON 失败", err);
  }
}

// 获取职位列表节点
export function getListByNode(node) {
  const children = node?.children;
  return function getListItem(index) {
    return children?.[index];
  };
}

// 监听 positionList-hook 节点，判断职位列表是否被挂载
function mutationContainer() {
  return new Promise((resolve, reject) => {
    const dom = document.querySelector(".positionlist__list");
    const observer = new MutationObserver(function (childList) {
      const isAdd = (childList || []).some((item) => {
        return item?.addedNodes?.length > 0;
      });
      return isAdd ? resolve(dom) : reject("未找到职位列表");
    });

    observer.observe(dom, {
      childList: true,
      subtree: false,
    });
  });
}

// 解析数据，插入时间标签
export async function parseZhilianData(list, getListItem) {
  list.forEach((item, index) => {
    const dom = getListItem(index);
    const { companyName } = item;
    const loadingLastModifyTimeTag = createLoadingDOM(
      companyName,
      "__zhilian_time_tag"
    );
    dom.appendChild(loadingLastModifyTimeTag);
  });
  await saveBrowseJob(list, PLATFORM_ZHILIAN);
  const jobDTOList = await JobApi.getJobBrowseInfoByIds(
    getJobIds(list, PLATFORM_ZHILIAN)
  );
  const analysisConfig = await getAnalysisConfig();
  list.forEach((item, index) => {
    const dom = getListItem(index);
    const tag = createDOM(jobDTOList[index], { analysisConfig });
    dom.appendChild(tag);
  });
  hiddenLoadingDOM();
  renderSortJobItem(
    jobDTOList,
    getListItem,
    { platform: PLATFORM_ZHILIAN }
  );
  await renderFunctionPanel(
    jobDTOList,
    getListItem,
    { platform: PLATFORM_ZHILIAN }
  );
  finalRender(jobDTOList, { platform: PLATFORM_ZHILIAN });
}

export function createDOM(jobDTO, { analysisConfig } = {}) {
  const div = document.createElement("div");
  div.classList.add("__zhilian_time_tag");
  renderTimeTag(div, jobDTO, { analysisConfig });
  return div;
}
