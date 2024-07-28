import {
    setupSortJobItem,
} from "../../commonRender";

import { handleData } from "./index.js";

let init = false;
let parentNode = null;
let previousChildLength = 0;

export async function handleBossRecommendData(data) {
    if (init) {
        mutationJobContainerLoadingFinish(parentNode, previousChildLength + data.length, data).then(async (value) => {
            await handleData(value.data || [], getListByNode(value.node, previousChildLength), getJobItemDetailUrlFunction, previousChildLength);
            previousChildLength += value.data.length;
        });
    } else {
        mutationContainer(data).then(async (node) => {
            init = true;
            parentNode = node;
            setupSortJobItem(node);
            let wrapperInner = document.querySelector(".recommend-result-inner");
            wrapperInner.style = "width:100%";
            let wrapper = document.querySelector(".recommend-result-job");
            wrapper.style = "display: flex;justify-content: center;"
            node.parentNode.style = "width:680px;overflow:hidden;padding-right:10px;"
            await handleData(data || [], getListByNode(node, previousChildLength), getJobItemDetailUrlFunction, 0);
            previousChildLength += data.length;
        });
        mutationJobContainerRemove();
    }
}

function mutationJobContainerRemove() {
    //选择搜索条件时，页面会把job item container移除，所以需要重置渲染逻辑
    const dom = document.querySelector(".recommend-result-job");
    return new Promise((resolve, reject) => {
        const observer = new MutationObserver(function (childList, obs) {
            (childList || []).forEach((item) => {
                const { removedNodes } = item;
                if (removedNodes && removedNodes.length > 0) {
                    removedNodes.forEach((node) => {
                        const { className } = node;
                        if (className === "job-list-container") {
                            observer.disconnect();
                            init = false;
                            previousChildLength = 0;
                            resolve()
                        }
                    });
                }
            })
        });
        observer.observe(dom, {
            childList: true,
            subtree: false,
        });
    });
}


function mutationJobContainerLoadingFinish(node, total, data) {
    return new Promise((resolve, reject) => {
        const observer = new MutationObserver(function (childList, obs) {
            (childList || []).forEach((item) => {
                if (node.childNodes.length == total) {
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
        return children?.[index + startIndex];
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