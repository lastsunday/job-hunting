import { PLATFORM_LIEPIN } from "../../../common";
import { saveBrowseJob, getJobIds } from "../../commonDataHandler";
import { JobApi } from "../../../common/api";
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
const DELAY_FETCH_TIME = 75; //ms
const DELAY_FETCH_TIME_RANDOM_OFFSET = 50; //ms

export function getLiepinData(responseText) {
  try {
    const data = JSON.parse(responseText);
    mutationContainer().then((node) => {
      setupSortJobItem(node);
      parseData(data?.data?.data?.jobCardList || [], getListByNode(node));
    });
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

// 监听节点，判断职位列表是否被挂载
function mutationContainer() {
  return new Promise((resolve, reject) => {
    const dom = document.querySelector(".content-left-section");
    let targetDeom = null;
    const observer = new MutationObserver(function (childList, obs) {
      const isAdd = (childList || []).some((item) => {
        let nodes = item?.addedNodes;
        if (nodes) {
          for (let i = 0; i < nodes.length; i++) {
            let nodeItem = nodes[i];
            if (nodeItem.className == "job-list-box") {
              targetDeom = nodeItem;
              return nodeItem;
            }
          }
          return false;
        } else {
          return false;
        }
      });
      return isAdd ? resolve(targetDeom) : reject("未找到职位列表");
    });

    observer.observe(dom, {
      childList: true,
      subtree: false,
    });
  });
}

// 解析数据，插入时间标签
async function parseData(list, getListItem) {
  const urlList = [];
  list.forEach((item, index) => {
    const dom = getListItem(index);
    const { link } = item.job;
    //apiUrl
    urlList.push(link);

    dom.classList.add("__LIEPIN_job_item");
    //某些职位不知什么原因不显示，现在把其显示出来
    let jobCard = dom.querySelector(".job-card-pc-container");
    if (jobCard.style.display == "none") {
      jobCard.style.display = "flex";
    }
    const { compName } = item.comp;
    let loadingLastModifyTimeTag = createLoadingDOM(
      compName,
      "__liepin_time_tag"
    );
    dom.appendChild(loadingLastModifyTimeTag);
  });
  const promiseList = urlList.map(async (url, index) => {
    await randomDelay(DELAY_FETCH_TIME * index, DELAY_FETCH_TIME_RANDOM_OFFSET); // 避免频繁请求触发风控
    const response = await fetch(url);
    const result = await response.text();
    return result;
  });
  Promise.allSettled(promiseList)
    .then(async (jobDetailHtmlContentList) => {
      const hrActiveTimeDescList = [];
      jobDetailHtmlContentList.forEach((item, index) => {
        let jobDesc = null;
        let jobDescFilterTextList = item.value.match(
          /<dd data-selector="job-intro-content">[\s\S]*?<\/dd>/g
        );
        if (jobDescFilterTextList && jobDescFilterTextList.length > 0) {
          const jobDescGroups = jobDescFilterTextList[0].match(
            /<dd data-selector="job-intro-content">(?<data>[\s\S]*)<\/dd>/
          )?.groups;
          if (jobDescGroups) {
            jobDesc = jobDescGroups["data"];
          }
        }
        list[index].job.jobDesc = jobDesc;
        let hrActiveTimeDesc = null;
        let hrActiveTimeDescGroups = item.value.match(
          /<span class="online off">(?<data>.*)<\/span>/
        )?.groups;
        if (hrActiveTimeDescGroups) {
          hrActiveTimeDesc = hrActiveTimeDescGroups["data"];
        }
        hrActiveTimeDescList.push(hrActiveTimeDesc);
      });
      await saveBrowseJob(list, PLATFORM_LIEPIN);
      let jobDTOList = await JobApi.getJobBrowseInfoByIds(
        getJobIds(list, PLATFORM_LIEPIN)
      );
      list.forEach((item, index) => {
        const { compId } = item.comp;
        jobDTOList[
          index
        ].jobCompanyApiUrl = `https://www.liepin.com/company/${compId}`;
        jobDTOList[index].hrActiveTimeDesc = hrActiveTimeDescList[index];
        const dom = getListItem(index);
        let tag = createDOM(jobDTOList[index]);
        dom.appendChild(tag);
      });
      hiddenLoadingDOM();
      renderSortJobItem(jobDTOList, getListItem, { platform: PLATFORM_LIEPIN });
      renderFunctionPanel(jobDTOList, getListItem, {
        platform: PLATFORM_LIEPIN,
        getCompanyInfoFunction: async function (url) {
          const response = await fetch(url);
          const result = await response.text();
          //eg: ["企业全称</span></p><pclass=\"text\">长沙裕邦软件开发有限公司</p>"]
          let firstFilterTextList = result
            .replaceAll("\n", "")
            .replaceAll(" ", "")
            .match(/企业全称<\/span><\/p>.*?\/p>/g);
          if (firstFilterTextList && firstFilterTextList.length > 0) {
            const groups = firstFilterTextList[0].match(/">(?<data>.*)<\/p>/)
              ?.groups;
            if (groups) {
              return groups["data"];
            } else {
              return null;
            }
          }
          return null;
        },
      });
      finalRender(jobDTOList, { platform: PLATFORM_LIEPIN });
    })
    .catch((error) => {
      console.log(error);
      hiddenLoadingDOM();
    });
}

export function createDOM(jobDTO) {
  const div = document.createElement("div");
  div.classList.add("__liepin_time_tag");
  renderTimeTag(div, jobDTO, { platform: PLATFORM_LIEPIN });
  return div;
}
