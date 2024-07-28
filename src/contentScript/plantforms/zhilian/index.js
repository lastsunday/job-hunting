import {
  renderTimeTag,
  setupSortJobItem,
  renderSortJobItem,
  createLoadingDOM,
  hiddenLoadingDOM,
  finalRender,
  renderFunctionPanel,
  setErrorLoadingDOM,
} from "../../commonRender";
import { PLATFORM_ZHILIAN } from "../../../common";
import { saveBrowseJob, getJobIds } from "../../commonDataHandler";
import { JobApi } from "../../../common/api";
import { httpFetchGetText } from "../../../common/api/common";
import {
  addAbortFunctionHandler,
  deleteAbortFunctionHandler,
} from "../../commonDataHandler";
import { randomDelay } from "../../../common/utils";
const DELAY_FETCH_TIME = 75; //ms
const DELAY_FETCH_TIME_RANDOM_OFFSET = 50; //ms

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
  let apiUrlList = [];
  list.forEach((item, index) => {
    const dom = getListItem(index);
    const { companyName, positionUrl } = item;
    let loadingLastModifyTimeTag = createLoadingDOM(
      companyName,
      "__zhilian_time_tag"
    );
    dom.appendChild(loadingLastModifyTimeTag);
    apiUrlList.push(positionUrl.replace(
      "http:",
      "https:"
    ));
  });
  const promiseList = apiUrlList.map(async (url, index) => {
    await randomDelay(DELAY_FETCH_TIME * index, DELAY_FETCH_TIME_RANDOM_OFFSET); // 避免频繁请求触发风控
    let abortFunctionHandler = null;
    const result = await httpFetchGetText(url, (abortFunction) => {
      abortFunctionHandler = abortFunction;
      //加入请求手动中断列表
      addAbortFunctionHandler(abortFunctionHandler);
    });
    //请求正常结束，从手动中断列表中移除
    deleteAbortFunctionHandler(abortFunctionHandler);
    return result;
  });
  Promise.allSettled(promiseList)
    .then(async (jsonList) => {
      jsonList.forEach((item, index) => {
        let htmlText = item.value;
        let parser = new DOMParser();
        let doc = parser.parseFromString(htmlText, "text/html");
        let targetScript = null;
        for (let i = 0; i < doc.scripts.length; i++) {
          let script = doc.scripts[i];
          if (script.outerText.includes("__INITIAL_STATE__=")) {
            targetScript = script;
            break;
          }
        }
        let data = JSON.parse(targetScript.outerText.replace("__INITIAL_STATE__=", ""))
        const { latitude, longitude } = data.jobInfo.jobDetail.detailedPosition;
        list[index].latitude = latitude;
        list[index].longitude = longitude;
      });
      await saveBrowseJob(list, PLATFORM_ZHILIAN);
      let jobDTOList = await JobApi.getJobBrowseInfoByIds(
        getJobIds(list, PLATFORM_ZHILIAN)
      );
      list.forEach((item, index) => {
        const dom = getListItem(index);
        let tag = createDOM(jobDTOList[index]);
        dom.appendChild(tag);
      });
      hiddenLoadingDOM();
      renderSortJobItem(
        jobDTOList,
        getListItem,
        { platform: PLATFORM_ZHILIAN }
      );
      renderFunctionPanel(
        jobDTOList,
        getListItem,
        { platform: PLATFORM_ZHILIAN }
      );
      finalRender(jobDTOList, { platform: PLATFORM_ZHILIAN });
    }).catch((error) => {
      console.log(error);
      setErrorLoadingDOM("加载职位信息失败，疑似详情页需要人机校验❕");
    });
}

export function createDOM(jobDTO) {
  const div = document.createElement("div");
  div.classList.add("__zhilian_time_tag");
  renderTimeTag(div, jobDTO);
  return div;
}
