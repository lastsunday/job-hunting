import {
    setupSortJobItem,
} from "../../commonRender";

import { handleData } from "./index.js";

export async function handleBossRecommendData(data, page, pageSize) {
    const startIndex = (page - 1) * pageSize;
    if (startIndex != 0) {
        const node = document.querySelector(".rec-job-list");
        mutationJobContainerLoadingFinish(node, startIndex + data.length, data).then(async (value) => {
            await handleData(value.data || [], getListByNode(value.node, startIndex), getJobItemDetailUrlFunction, startIndex, { isRecommendPage: true });
        });
    } else {
        mutationContainer(data).then(async (node) => {
            setupSortJobItem(node);
            const wrapperInner = document.querySelector(".recommend-result-inner");
            wrapperInner.style = "width: auto;max-width: 1366px;";
            const wrapper = document.querySelector(".recommend-result-job");
            wrapper.style = "display: flex;justify-content: center;"
            node.parentNode.style = "width:680px;padding-right:10px;"
            await handleData(data || [], getListByNode(node, startIndex), getJobItemDetailUrlFunction, 0, { isRecommendPage: true });
        });
    }
}

function mutationJobContainerLoadingFinish(node, total, data) {
    return new Promise((resolve, reject) => {
        const observer = new MutationObserver(function (childList, obs) {
            (childList || []).forEach((item) => {
                if (node.childNodes.length >= total) {
                    observer.disconnect();
                    resolve({ node, data });
                }
            });
        });
        observer.observe(node, {
            childList: true,
            subtree: false,
        });
    });
}

function getJobItemDetailUrlFunction(dom) {
    return dom
        .querySelector(".job-info")
        .querySelector(".job-title")
        .querySelector(".job-name")
        .href;
}

// 获取列表节点
function getListByNode(node, startIndex) {
    const children = node?.children;
    return function getListItem(index) {
        return children?.[index + startIndex].querySelector(".job-card-box");
    };
}

function mutationContainer() {
    return new Promise((resolve, reject) => {
        const dom = document.querySelector(".recommend-result-job");
        const observer = new MutationObserver(function (childList, obs) {
            (childList || []).forEach((item) => {
                const { addedNodes } = item;
                if (addedNodes && addedNodes.length > 0) {
                    addedNodes.forEach((node) => {
                        const { className } = node;
                        if (className === "job-list-container") {
                            observer.disconnect();
                            resolve(node.querySelector(".rec-job-list"));
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