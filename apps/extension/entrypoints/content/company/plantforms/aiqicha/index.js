import dayjs from "dayjs";
import {
    companyNameConvert,
    getCompanyFromCompanyInfo, stopAndCleanAbortFunctionHandler
} from "../../../commonDataHandler";
import { CompanyApi } from "../../../../../common/api";
import { genIdFromText } from "../../../../../common/utils";
import {
    createCompanyTag,
    createCompanyInfoDetail, createCompanyReputation,
    createSearchCompanyLink, createLogo,
    genCommentTextButton, clearAllChildNode
} from "../../../commonRender";
import { PLATFORM_AIQICHA } from "../../../../../common";
import { COMPANY_DATA_EXPRIE_DAY } from "../../../../../common/config";

let init = true;
let functionPanelDivList = [];
export function handle(data, firstTimeOpen) {
    mutationContainer(data, firstTimeOpen).then((node) => {
        stopAndCleanAbortFunctionHandler();
        handleData(data || [], getListByNode(node));
    });
}

function handleData(list, getListItem) {
    // debug data
    // console.log(list);
    if (init) {
        init = false;
        list.forEach((item, index) => {
            const itemDom = getListItem(index);
            //fix comment dialog display
            itemDom.style = "overflow: visible;display:ruby;";
            const wrapperDiv = document.createElement("div");
            wrapperDiv.className = `__company_info_quick_search __${PLATFORM_AIQICHA}_function_panel`;
            wrapperDiv.addEventListener("click", event => {
                event.stopPropagation();
            });
            itemDom.appendChild(wrapperDiv);
            functionPanelDivList.push(wrapperDiv);
        });
    }

    list.forEach(async (item, index) => {
        let functionPanelDiv = functionPanelDivList[index];
        clearAllChildNode(functionPanelDiv);
        let operationMenu = document.createElement("div");
        functionPanelDiv.appendChild(operationMenu);

        let quickSearchButtonLoading = document.createElement("div");
        quickSearchButtonLoading.className = "__company_info_quick_search_button";
        quickSearchButtonLoading.addEventListener("click", (event) => {
            quickSearchHandle(false);
        });
        operationMenu.appendChild(quickSearchButtonLoading);

        quickSearchHandle(false);

        async function quickSearchHandle(forceSyncData) {
            let companyName = item.titleName;
            companyName = companyNameConvert(companyName);
            clearAllChildNode(functionPanelDiv);
            clearAllChildNode(operationMenu);
            functionPanelDiv.appendChild(operationMenu);
            operationMenu.appendChild(quickSearchButtonLoading);
            quickSearchButtonLoading.textContent = `🔎正查询【${companyName}】⌛︎`;
            operationMenu.appendChild(quickSearchButtonLoading);
            try {
                let convertedCompanyName = companyNameConvert(companyName);
                //查询数据库是否有公司信息
                let company = await CompanyApi.getCompanyById(
                    genIdFromText(convertedCompanyName)
                );
                let now = dayjs();
                if (
                    !forceSyncData &&
                    company &&
                    now.isBefore(dayjs(company.updateDatetime).add(COMPANY_DATA_EXPRIE_DAY, "day"))
                ) {
                    //skip
                } else {
                    //数据库没有数据或数据过期了，则进行网络查询，保存数据到数据库
                    let companyInfo = item;
                    company = await getCompanyFromCompanyInfo(companyInfo, convertedCompanyName);
                }
                clearAllChildNode(functionPanelDiv);
                functionPanelDiv.appendChild(createCompanyInfoDetail(company, quickSearchHandle));
            } catch (e) {
                console.log(e);
                operationMenu.appendChild(createFixValidHummanButton(companyName));
                quickSearchButtonLoading.textContent = `🔎查询【${companyName}】失败，点击重新查询`;
            } finally {
                let reputationWrapperDiv = document.createElement("div");
                let companyTagWrapperDiv = document.createElement("div");
                functionPanelDiv.appendChild(reputationWrapperDiv);
                functionPanelDiv.appendChild(companyTagWrapperDiv);
                companyTagWrapperDiv.append(createCompanyTag(companyName))
                reputationWrapperDiv.append(createCompanyReputation(companyName, () => {
                    clearAllChildNode(companyTagWrapperDiv);
                    companyTagWrapperDiv.append(createCompanyTag(companyName));
                }));
                functionPanelDiv.appendChild(createSearchCompanyLink(companyName));
                functionPanelDiv.appendChild(createCommentWrapper(companyName));
                functionPanelDiv.appendChild(createLogo());
            }
        }
    });

}

function createFixValidHummanButton(companyName) {
    let fixValidHummanButton = document.createElement("a");
    fixValidHummanButton.className = "__company_info_quick_search_button";
    fixValidHummanButton.target = "_blank";
    fixValidHummanButton.ref = "noopener noreferrer";
    fixValidHummanButton.textContent =
        "一直查询失败？点击该按钮去尝试解除人机验证吧！";
    const url = `https://aiqicha.baidu.com/s?q=${encodeURIComponent(companyName)}`;
    fixValidHummanButton.href = url;
    return fixValidHummanButton;
}

function createCommentWrapper(companyName) {
    let commentWrapperDiv = document.createElement("div");
    let companyIdSha256 = genIdFromText(companyName);
    commentWrapperDiv.classList.add("__comment_wrapper");
    commentWrapperDiv.classList.add("__" + PLATFORM_AIQICHA + "_comment_wrapper");
    let companyCommentButton = genCommentTextButton(
        commentWrapperDiv,
        "查看公司评论💬",
        companyName,
        companyIdSha256
    );
    commentWrapperDiv.append(companyCommentButton);
    return commentWrapperDiv;
}

// 获取列表节点
function getListByNode(node) {
    const children = node?.children;
    return function getListItem(index) {
        return children?.[index];
    };
}

function mutationContainer(data, firstTimeOpen) {
    return new Promise((resolve, reject) => {
        const companyList = document.querySelector(".company-list");
        //fix comment dialog display
        if(companyList){
            companyList.style = "overflow: visible;";
        }
        const dom = companyList?.querySelector(".wrap");
        if (firstTimeOpen) {
            if (dom) {
                resolve(dom);
            } else {
                reject("未找到公司列表");
            }
        } else {
            let companyNameAndObjectMap = new Map();
            for (let i = 0; i < data.length; i++) {
                let item = data[i];
                companyNameAndObjectMap.set(item.entName, item);
            }
            let lastItemCompanyName = data[data.length - 1].entName;
            const observer = new MutationObserver(function (mutationList, obs) {
                mutationList.forEach((mutation) => {
                    if (mutation.type == "attributes") {
                        if (mutation.attributeName == "title") {
                            let target = mutation.target;
                            let title = target.title;
                            let actualPid = target.getAttribute("data-log-title").replace("item-", "");
                            //寻找并替换真实的pid
                            companyNameAndObjectMap.get(title).pid = actualPid;
                            if (lastItemCompanyName == title) {
                                observer.disconnect();
                                resolve(dom);
                            }
                        }
                    }
                });
            });

            observer.observe(dom, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ["title"],
            });
        }
    });
}