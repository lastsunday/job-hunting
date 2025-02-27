import { PLATFORM_JOBONLINE } from "../../../../common";
import { saveBrowseJob, getJobIds, getAnalysisConfig } from "../../commonDataHandler";
import { JobApi } from "../../../../common/api";
import {
    renderTimeTag,
    setupSortJobItem,
    renderSortJobItem,
    createLoadingDOM,
    hiddenLoadingDOM,
    finalRender,
    renderFunctionPanel,
} from "../../commonRender";
import { randomDelay } from "../../../../common/utils";
const DELAY_FETCH_TIME = 75; //ms
const DELAY_FETCH_TIME_RANDOM_OFFSET = 50; //ms

export function getJobOnlineData(responseText) {
    try {
        const data = JSON.parse(responseText);
        mutationContainer().then((node) => {
            setupSortJobItem(node);
            handleData(data?.object?.rows || [], getListByNode(node));
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

// 监听 positionList-hook 节点，判断职位列表是否被挂载
function mutationContainer() {
    return new Promise((resolve, reject) => {
        const dom = document.querySelector(".position-wrap");
        const observer = new MutationObserver(function (childList, obs) {
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
async function handleData(list, getListItem) {
    const detailApiUrlList = [];
    list.forEach((item, index) => {
        const dom = getListItem(index);
        const { id, companyName } = item;

        detailApiUrlList.push(`https://api.jobonline.cn/jobtbao-platform-srv/position/getPositionDetail/${id}`);

        const loadingLastModifyTimeTag = createLoadingDOM(
            companyName,
            "__job_online_time_tag"
        );
        dom.appendChild(loadingLastModifyTimeTag);
    });
    const promiseList = detailApiUrlList.map(async (url, index) => {
        await randomDelay(DELAY_FETCH_TIME * index, DELAY_FETCH_TIME_RANDOM_OFFSET); // 避免频繁请求触发风控
        const response = await fetch(url, { method: "POST" });
        const result = await response.json();
        return Object.assign(result.object, list[index]);
    });
    Promise.allSettled(promiseList)
        .then(async (response) => {
            const jsonList = response.map(item => item.value);
            await saveBrowseJob(jsonList, PLATFORM_JOBONLINE);
            const jobDTOList = await JobApi.getJobBrowseInfoByIds(
                getJobIds(jsonList, PLATFORM_JOBONLINE)
            );
            const analysisConfig = await getAnalysisConfig();
            list.forEach((item, index) => {
                const dom = getListItem(index);
                const tag = createDOM(jobDTOList[index], { analysisConfig });
                dom.appendChild(tag);
            });
            hiddenLoadingDOM();
            renderSortJobItem(jobDTOList, getListItem, { platform: PLATFORM_JOBONLINE });
            await renderFunctionPanel(jobDTOList, getListItem, { platform: PLATFORM_JOBONLINE });
            finalRender(jobDTOList, { platform: PLATFORM_JOBONLINE });
        }).catch((error) => {
            console.log(error);
            hiddenLoadingDOM();
        });
}

export function createDOM(jobDTO, { analysisConfig }) {
    const div = document.createElement("div");
    div.classList.add("__job_online_time_tag");
    renderTimeTag(div, jobDTO, { analysisConfig });
    return div;
}
