import { PLATFORM_GGFW_HRSS_GD } from "../../../../common";
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

export function getGgfwHrssGdData(responseText) {
    try {
        const data = JSON.parse(responseText);
        mutationContainer().then((node) => {
            setupSortJobItem(node);
            handleData(data?.data?.records || [], getListByNode(node));
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
        const dom = document.querySelector(".search-content-result");
        const observer = new MutationObserver(function (childList, obs) {
            let targetNode;
            try {
                targetNode = document.querySelector(".ant-list-items");
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
async function handleData(list, getListItem) {
    const detailApiUrlList = [];
    list.forEach((item, index) => {
        const dom = getListItem(index);
        const { bcb009: id, aab004: companyName } = item;

        detailApiUrlList.push(`https://ggfw.hrss.gd.gov.cn/recruitment/internet/main/internet/r/c/webpage/homepage/position/detail/${id}`);

        const loadingLastModifyTimeTag = createLoadingDOM(
            companyName,
            "__job_ggfw_hrss_gd_time_tag"
        );
        //delete before insert element
        dom.querySelectorAll(`.__job_ggfw_hrss_gd_time_tag`).forEach(item => item.parentElement.removeChild(item));
        dom.appendChild(loadingLastModifyTimeTag);
    });
    const promiseList = detailApiUrlList.map(async (url, index) => {
        await randomDelay(DELAY_FETCH_TIME * index, DELAY_FETCH_TIME_RANDOM_OFFSET); // 避免频繁请求触发风控
        const response = await fetch(url);
        const result = await response.json();
        return Object.assign(list[index], result.data);
    });
    Promise.allSettled(promiseList)
        .then(async (response) => {
            const jsonList = response.map(item => item.value);
            await saveBrowseJob(jsonList, PLATFORM_GGFW_HRSS_GD);
            const jobDTOList = await JobApi.getJobBrowseInfoByIds(
                getJobIds(jsonList, PLATFORM_GGFW_HRSS_GD)
            );
            const analysisConfig = await getAnalysisConfig();
            list.forEach((item, index) => {
                const dom = getListItem(index);
                const tag = createDOM(jobDTOList[index], { analysisConfig });
                //delete before insert element
                dom.querySelectorAll(`.__job_ggfw_hrss_gd_time_tag`).forEach(item => item.parentElement.removeChild(item));
                dom.appendChild(tag);
            });
            hiddenLoadingDOM();
            renderSortJobItem(jobDTOList, getListItem, { platform: PLATFORM_GGFW_HRSS_GD });
            await renderFunctionPanel(jobDTOList, getListItem, { platform: PLATFORM_GGFW_HRSS_GD });
            finalRender(jobDTOList, { platform: PLATFORM_GGFW_HRSS_GD });
        }).catch((error) => {
            console.log(error);
            hiddenLoadingDOM();
        });
}

export function createDOM(jobDTO, { analysisConfig }) {
    const div = document.createElement("div");
    div.classList.add("__job_ggfw_hrss_gd_time_tag");
    renderTimeTag(div, jobDTO, { analysisConfig });
    return div;
}
