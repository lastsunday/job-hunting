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
import { randomDelay } from "../../utils";
import { PLATFORM_JOBSDB } from "../../common";
import { saveBrowseJob, getJobIds } from "../../commonDataHandler";
import { JobApi } from "../../api";

const DELAY_FETCH_TIME = 75; //ms
const DELAY_FETCH_TIME_RANDOM_OFFSET = 50; //ms

export function getJobsdbData(responseText) {
  try {
    const data = JSON.parse(responseText);
    mutationContainer().then((node) => {
      setupSortJobItem(node);
      parseData(data?.data || [], getListByNode(node));
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
    let targetNode = children?.[index].childNodes[0].childNodes[0];
    return targetNode;
  };
}

// 监听 search-job-result 节点，判断职位列表是否被挂载
function mutationContainer() {
  return new Promise((resolve, reject) => {
    const dom = document.querySelector('[name="sticky-save-search-desktop"]');
    const observer = new MutationObserver(function (childList, obs) {
      let targetNode;
      try {
        targetNode = document.querySelector(
          "section[data-automation='related-searches-splitview']"
        ).parentNode.childNodes[1].childNodes[0].childNodes[2];
      } catch (e) {
        //skip
      }
      if (targetNode) {
        observer.disconnect();
        resolve(targetNode);
      }
    });

    observer.observe(dom, {
      childList: true,
      subtree: true,
    });
  });
}

// 解析数据，插入时间标签
function parseData(list, getListItem) {
  const detailHtmlUrlList = [];
  const urlList = [];
  list.forEach((item, index) => {
    const { id } = item;
    const { description: companyName } = item.advertiser;
    const dom = getListItem(index);
    //apiUrl
    let pureJobItemDetailHtmlUrl = "https://hk.jobsdb.com/job/" + id;
    detailHtmlUrlList.push(pureJobItemDetailHtmlUrl);
    //jobUrl
    urlList.push("https://hk.jobsdb.com/job/" + id);

    let loadingLastModifyTimeTag = createLoadingDOM(
      companyName,
      "__jobsdb_time_tag"
    );
    dom.appendChild(loadingLastModifyTimeTag);
  });
  const promiseList = detailHtmlUrlList.map(async (url, index) => {
    await randomDelay(DELAY_FETCH_TIME * index, DELAY_FETCH_TIME_RANDOM_OFFSET); // 避免频繁请求触发风控
    const response = await fetch(url);
    const result = await response.text();
    return result;
  });
  Promise.allSettled(promiseList)
    .then(async (htmlList) => {
      let jobDTOList = [];
      htmlList.forEach((item, index) => {
        let htmlString = item.value;
        let matchContent = htmlString.match("window.SEEK_REDUX_DATA = .*");
        if (matchContent && matchContent.length > 0) {
          let configJsonString = matchContent[0]
            .replaceAll("window.SEEK_REDUX_DATA = ", "")
            .replace(/.$/, "")
            .replaceAll("undefined", '""');
          let json = JSON.parse(configJsonString);
          let content = json.jobdetails.result.job.content;
          list[index].jobDetail = content;
        }
        list[index].jobUrl = urlList[index];
      });
      await saveBrowseJob(list, PLATFORM_JOBSDB);
      jobDTOList = await JobApi.getJobBrowseInfoByIds(
        getJobIds(list, PLATFORM_JOBSDB)
      );
      jobDTOList.forEach((item, index) => {
        const dom = getListItem(index);
        let tag = createDOM(jobDTOList[index]);
        dom.appendChild(tag);
      });
      hiddenLoadingDOM();
      renderSortJobItem(jobDTOList, getListItem, {
        platform: PLATFORM_JOBSDB,
      });
      renderFunctionPanel(jobDTOList, getListItem, {
        platform: PLATFORM_JOBSDB,
      });
      finalRender(jobDTOList, {
        platform: PLATFORM_JOBSDB,
      });
    })
    .catch((error) => {
      console.log(error);
      hiddenLoadingDOM();
    });
}

function createDOM(jobDTO) {
  const div = document.createElement("div");
  div.classList.add("__jobsdb_time_tag");
  renderTimeTag(div, jobDTO);
  return div;
}
