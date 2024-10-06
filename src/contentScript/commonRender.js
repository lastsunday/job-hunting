import dayjs from "dayjs";
import { isOutsource } from "../common/data/outsource";
import { isTraining } from "../common/data/training";
import {
  convertTimeToHumanReadable,
  convertTimeOffsetToHumanReadable,
  autoFillHttp,
  getDomain,
  genIdFromText,
  genUniqueId,
} from "../common/utils";
import {
  PLATFORM_BOSS,
  PLATFORM_JOBSDB,
  PLATFORM_LIEPIN,
  TAG_IT_BLACK_LIST,
  TAG_RUOBILIN_BLACK_LIST,
  TAG_IT_BLACK_LIST_2,
  TAG_CREDIT_BJ_BLACK_LIST,
} from "../common";
import {
  JOB_STATUS_DESC_NEWEST
} from "./common";
import {
  genSha256,
  companyNameConvert,
  getCompanyFromCompanyInfo,
  getCompanyInfoByAiqicha,
  stopAndCleanAbortFunctionHandler,
  addAbortFunctionHandler,
  deleteAbortFunctionHandler,
  addCompanyTagNotExists,
} from "./commonDataHandler";
import { httpFetchGetText, httpFetchJson } from "../common/api/common";

import { logoBase64 } from "./assets/logo";
import $ from "jquery";
import { CompanyApi, TagApi, AuthApi, UserApi, JobApi } from "../common/api";
import { GithubApi } from "../common/api/github";
import { Company } from "../common/data/domain/company";
import { errorLog, infoLog } from "../common/log";
import { COMMENT_PAGE_SIZE, COMPANY_DATA_EXPRIE_DAY } from "../common/config";

const ACTIVE_TIME_MATCH = /(?<num>[0-9\.]*)/;

import Tagify from '@yaireo/tagify';
import DragSort from '@yaireo/dragsort';
import { CompanyTagBO } from "../common/data/bo/companyTagBO";
import { el } from "element-plus/es/locale/index.mjs";

export function renderTimeTag(
  divElement,
  jobDTO,
  { jobStatusDesc, platform } = {}
) {
  if (jobDTO == null || jobDTO == undefined) {
    throw new Error("jobDTO is required");
  }
  //对发布时间的处理
  if (platform && platform == PLATFORM_BOSS) {
    let statusTag = null;
    //jobStatusDesc
    if (jobStatusDesc) {
      statusTag = document.createElement("span");
      let statusToTimeText = "";
      if (jobStatusDesc == JOB_STATUS_DESC_NEWEST) {
        statusToTimeText = "一周内";
        statusTag.textContent = "【 " + statusToTimeText + "发布❔】";
        statusTag.title =
          "当前招聘状态【" +
          jobStatusDesc.label +
          "】，招聘状态：最新：代表一周内发布；招聘中：代表发布时间超过一周";
      } else {
        statusTag.textContent = "【发布时间未知】";
      }
      statusTag.classList.add("__time_tag_base_text_font");
      divElement.appendChild(statusTag);
    }
  } else if (platform && platform == PLATFORM_LIEPIN) {
    //refreshTime
    let refreshTime = jobDTO.jobFirstPublishDatetime;
    if (refreshTime) {
      let refreshTimeTag = document.createElement("span");
      let refreshTimeHumanReadable = convertTimeToHumanReadable(refreshTime);
      refreshTimeTag.textContent += "【" + refreshTimeHumanReadable + "更新】";
      refreshTimeTag.classList.add("__time_tag_base_text_font");
      divElement.appendChild(refreshTimeTag);
    }
  } else {
    //firstPublishTime
    let firstPublishTime = jobDTO.jobFirstPublishDatetime;
    if (firstPublishTime) {
      let firstPublishTimeTag = document.createElement("span");
      let firstPublishTimeHumanReadable = convertTimeToHumanReadable(
        firstPublishTime
      );
      firstPublishTimeTag.textContent +=
        "【" + firstPublishTimeHumanReadable + "发布】";
      firstPublishTimeTag.classList.add("__time_tag_base_text_font");
      divElement.appendChild(firstPublishTimeTag);
    }
  }
  if (jobDTO.hrActiveTimeDesc) {
    let hrActiveTimeDescTag = document.createElement("span");
    hrActiveTimeDescTag.textContent = "【HR-" + jobDTO.hrActiveTimeDesc + "】";
    hrActiveTimeDescTag.classList.add("__time_tag_base_text_font");
    divElement.appendChild(hrActiveTimeDescTag);
  }
  //显示职位介绍
  divElement.title = jobDTO.jobDescription;
  //companyInfo
  let companyInfoTag = null;
  let companyInfoText = getCompanyInfoText(jobDTO.jobCompanyName);
  if (companyInfoText !== "") {
    companyInfoTag = document.createElement("span");
    companyInfoTag.textContent = companyInfoText;
    companyInfoTag.classList.add("__time_tag_base_text_font");
    divElement.appendChild(companyInfoTag);
  }

  divElement.classList.add("__time_tag_base_text_font");

  //为time tag染色
  if (jobDTO.hrActiveTimeDesc && platform == PLATFORM_BOSS) {
    //根据hr活跃时间为JobItem染色
    let now = dayjs();
    let hrActiveDatetime = now.subtract(
      convertHrActiveTimeDescToOffsetTime(jobDTO.hrActiveTimeDesc),
      "millisecond"
    );
    divElement.style = getRenderTimeStyle(hrActiveDatetime);
  } else {
    divElement.style = getRenderTimeStyle(
      jobDTO.jobFirstPublishDatetime ?? null,
      jobStatusDesc
    );
  }
}

export function finalRender(jobDTOList, { platform }) {
  for (let i = 0; i < jobDTOList.length; i++) {
    let item = jobDTOList[i];
    let jobId = item.jobId;
    let jobItemIdSha256 = genIdFromText(jobId);
    let commentWrapperDiv = document.getElementById("wrapper" + jobId);
    commentWrapperDiv.classList.add("__comment_wrapper");
    commentWrapperDiv.classList.add("__" + platform + "_comment_wrapper");
    let jobItemCommentButton = genCommentTextButton(
      commentWrapperDiv,
      "查看职位评论💬",
      item.jobName + "-" + item.jobCompanyName,
      jobItemIdSha256
    );
    commentWrapperDiv.append(jobItemCommentButton);
    if(i == jobDTOList.length-1){
      commentWrapperDiv.appendChild($(`<div class="__status_job_render_finish"></div>`)[0]);
    }
  }
}

export function genCommentTextButton(commentWrapperDiv, buttonLabel, dialogTitle, id) {
  const dialogDiv = document.createElement("div");
  dialogDiv.className = "__comment_dialog";

  const menuDiv = document.createElement("div");
  menuDiv.className = "__comment_menu";

  const maximizeDiv = document.createElement("div");
  maximizeDiv.className = "__comment_menu_button";
  maximizeDiv.textContent = "⬜";
  menuDiv.appendChild(maximizeDiv);

  const closeDiv = document.createElement("div");
  closeDiv.className = "__comment_menu_button";
  closeDiv.textContent = "✖️";
  closeDiv.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    commentWrapperDiv.removeChild(dialogDiv);
  });
  menuDiv.appendChild(closeDiv);

  dialogDiv.append(menuDiv);
  const titleDiv = document.createElement("div");
  titleDiv.className = "__comment_dialog_title";
  titleDiv.textContent = dialogTitle;
  dialogDiv.appendChild(titleDiv);
  const contentDiv = document.createElement("div");
  contentDiv.className = "__comment_content";
  let maximize = false;
  const maximizeFunction = (event) => {
    event.preventDefault();
    event.stopPropagation();
    maximize = !maximize;
    if (maximize) {
      dialogDiv.classList.remove("__dialog_normal");
      dialogDiv.classList.add("__dialog_maximize");
    } else {
      dialogDiv.classList.remove("__dialog_maximize");
      dialogDiv.classList.add("__dialog_normal");
    }
  };
  maximizeDiv.addEventListener("click", maximizeFunction);
  menuDiv.addEventListener("dblclick", maximizeFunction);

  const commentButtonDiv = document.createElement("div");
  commentButtonDiv.textContent = buttonLabel;
  commentButtonDiv.className = "__comment_button";
  commentButtonDiv.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    commentWrapperDiv.appendChild(dialogDiv);
    dialogDiv.classList.add("__dialog_normal");
    clearAllChildNode(contentDiv);
    dialogDiv.append(contentDiv);

    renderCommentContent({ first: COMMENT_PAGE_SIZE, id }, contentDiv);

  });
  return commentButtonDiv;
}

async function renderCommentContent({ first, after, last, before, id } = {}, contentDiv) {
  let loadingLabel = $('<div>正加载评论⌛︎</div>')[0];
  let loadingDiv = $(`<div class="__comment_loading"></div>`)
    .append(loadingLabel)[0];
  contentDiv.appendChild(loadingDiv);
  //获取loginInfo，如获取成功
  let loginInfo = await AuthApi.authGetToken();
  if (!loginInfo) {
    //获取失败
    contentDiv.removeChild(loadingDiv);
    let login = $(`<div>点击登录到GitHub后可查看评论</div>`);
    let installLogin = $(`<div>(如需添加评论，请到后台管理[设置]页面安装GitHubApp)</div>`);
    let loginDiv = $(`<div class="__comment_loading"></div>`).append(login).append(installLogin)[0];
    contentDiv.appendChild(loginDiv);
    loginDiv.addEventListener("click", async () => {
      //执行登录流程
      clearAllChildNode(contentDiv);
      contentDiv.appendChild(loadingDiv);
      try {
        loadingLabel.textContent = "登录中⌛︎";
        loginInfo = await AuthApi.authOauth2Login();
        loadingLabel.textContent = "登录成功";
        renderCommentContent({ first, after, last, before, id }, contentDiv);
      } catch (e) {
        errorLog(e);
        //TODO handle login failure
        loadingLabel.textContent = "登录失败，点击重新登录";
        loadingLabel.addEventListener("click", (event) => {
          renderCommentContent({ first, after, last, before, id }, contentDiv);
        });
      }
    });
    return;
  }
  loadingLabel.textContent = "正加载评论⌛︎";
  let data = null;
  try {
    data = await queryComment({ first, after, last, before, id });
    clearAllChildNode(contentDiv);
    let items = data?.search?.nodes;
    let pageInfo = data?.search?.pageInfo;
    let total = data?.search?.issueCount;
    if (total == 0) {
      contentDiv.appendChild(createEmptyComment());
    } else {
      for (let i = 0; i < items.length; i++) {
        let item = items[i];
        let author = item.author;
        contentDiv.appendChild(createCommentRow(author.avatarUrl, author.login, item.createdAt, item.lastEditedAt, item.bodyText, item.bodyUrl));
      }
      contentDiv.appendChild(createCommonPageOperationMenu(pageInfo.hasPreviousPage, pageInfo.hasNextPage, pageInfo.startCursor, pageInfo.endCursor, total, async ({ first, after, last, before } = {}) => {
        renderCommentContent({ first, after, last, before, id }, contentDiv)
      }));
    }
    let userDTO = await UserApi.userGet();
    contentDiv.appendChild(createAddCommentRow(contentDiv, loadingDiv, () => {
      renderCommentContent({ first: COMMENT_PAGE_SIZE, id }, contentDiv)
    }, id, userDTO?.avatarUrl, userDTO?.login));
  } catch (e) {
    errorLog(e);
    loadingLabel.textContent = "加载评论失败，点击重新加载";
    loadingLabel.addEventListener("click", (event) => {
      renderCommentContent({ first, after, last, before, id }, contentDiv);
    });
  }

}

async function queryComment({ first, after, last, before, id } = {}) {
  return await GithubApi.queryComment({ first, after, last, before, id });
}

function createEmptyComment() {
  let result = $(`<div class="__comment_empty_content">没有评论</div>`);
  return result[0];
}

function createCommentRow(avatarUrl, username, createdAt, lastEditedAt, content, bodyUrl) {
  let result = $(`
    <div class="__comment_row">
      <div>
        <img class="__avatar" src="${avatarUrl}" alt="@${username}">
      </div>
      <div class="__right">
        <div class="__header">
          <div class="__time">${username}</div>
          <div class="__username" title="${dayjs(lastEditedAt || createdAt).format("YYYY-MM-DD HH:mm:ss")}">更新于${convertTimeOffsetToHumanReadable(lastEditedAt || createdAt)}</div>
          <div class="__source"><a target="_blank" href="${bodyUrl}">评论来源</a></div>
        </div>
        <div class="__content">
          <div>
            <div>${content}</div>
          </div>
        </div>
      </div>
    </div>
    `);
  return result[0];
}

function createAddCommentRow(contentDiv, loadingDiv, queryFunction, id, avatarUrl, username) {
  let textareaId = genUniqueId();
  let submitComment = $(`<div class="__comment_submit_button_wrapper"><div class="__comment_submit_button">提交评论</div></div>`)[0];
  const submitFunction = async () => {
    loadingDiv.textContent = "评论提交中⌛︎";
    try {
      contentDiv.appendChild(loadingDiv);
      let content = $(`#${textareaId}`)[0].value;
      if (content && content.length > 10) {
        infoLog(`submit comment title(company id)=${id},body=${content}`)
        await GithubApi.addComment(id, content);
        loadingDiv.textContent = "评论内容成功，点击刷新列表";
        contentDiv.appendChild(loadingDiv);
        let removeLoadingFunction = () => {
          loadingDiv.removeEventListener("click", removeLoadingFunction);
          contentDiv.removeChild(loadingDiv);
          queryFunction();
        };
        loadingDiv.addEventListener("click", removeLoadingFunction);
      } else {
        loadingDiv.textContent = "评论内容长度过短，请重新编辑后提交";
        contentDiv.appendChild(loadingDiv);
        let removeLoadingFunction = () => {
          loadingDiv.removeEventListener("click", removeLoadingFunction);
          contentDiv.removeChild(loadingDiv);
        };
        loadingDiv.addEventListener("click", removeLoadingFunction);
      }
    } catch (e) {
      errorLog(e);
      loadingDiv.textContent = "评论提交失败，点击后，重新提交";
      contentDiv.appendChild(loadingDiv);
      let removeLoadingFunction = () => {
        loadingDiv.removeEventListener("click", removeLoadingFunction);
        contentDiv.removeChild(loadingDiv);
      };
      loadingDiv.addEventListener("click", removeLoadingFunction);
    }
  };
  submitComment.addEventListener("click", submitFunction);
  let result = $(`
    <div>
    <div class="__comment_submit_content">
      <div>
        <img class="__avatar" src="${avatarUrl}" alt="@${username}">
      </div>
      <div class="__comment_submit_content_wrapper">
        <div class="__comment_title_wrapper">
          <div class="__comment_title">添加一条评论</div>
        </div>
        <div class="__comment_content_wrapper">
            <textarea id="${textareaId}" class="__comment_content_wrapper_content" placeholder="在这里写下评论"></textarea>
        </div>
      </div>
    </div>
    </div>
    `).append(submitComment);
  return result[0];
}

function createCommonPageOperationMenu(hasPreviousPage, hasNextPage, startCursor, endCursor, total, queryFunction) {
  let result = $(`
    <div class="__comment_paging_wrapper">
      <div class="__comment_paging_total">共${total}条</div>
    </div>
    `);
  if (hasPreviousPage) {
    let element = $(`<div class="__company_info_quick_search_button __comment_paging_button">上一页</div>`)[0];
    element.addEventListener("click", async (event) => {
      queryFunction({ last: COMMENT_PAGE_SIZE, before: `${startCursor}` });
    })
    result.append(element);
  }
  if (hasNextPage) {
    let element = $(`<div class="__company_info_quick_search_button __comment_paging_button">下一页</div>`)[0];
    element.addEventListener("click", async (event) => {
      queryFunction({ first: COMMENT_PAGE_SIZE, after: `${endCursor}` });
    })
    result.append(element);
  }
  return result[0];
}

export function createLoadingDOM(brandName, styleClass) {
  const div = document.createElement("div");
  div.classList.add(styleClass);
  div.classList.add("__loading_tag");
  renderTimeLoadingTag(div, brandName);
  return div;
}

export function setErrorLoadingDOM(text) {
  let loadingTagList = document.querySelectorAll(".__loading_tag");
  if (loadingTagList) {
    loadingTagList.forEach((item) => {
      item.classList.add("__status_job_render_error");
      item.textContent = text;
    });
  }
}

export function hiddenLoadingDOM() {
  let loadingTagList = document.querySelectorAll(".__loading_tag");
  if (loadingTagList) {
    loadingTagList.forEach((item) => {
      item.style = "visibility: hidden;";
    });
  }
}

export function renderTimeLoadingTag(divElement, brandName) {
  let timeText = "【正查找发布时间⌛︎】";
  let text = timeText;
  text += getCompanyInfoText(brandName);
  divElement.style = getRenderTimeStyle();
  divElement.classList.add("__time_tag_base_text_font");
  divElement.textContent = text;
}

function getCompanyInfoText(brandName) {
  let text = "";
  const isOutsourceBrand = isOutsource(brandName);
  const isTrainingBrand = isTraining(brandName);
  if (isOutsourceBrand) {
    text += "【疑似外包公司】";
  }
  if (isTrainingBrand) {
    text += "【疑似培训机构】";
  }
  if (isOutsourceBrand || isTrainingBrand) {
    text += "⛅";
  } else {
    text += "☀";
  }
  return text;
}

function getRenderTimeStyle(lastModifyTime, jobStatusDesc) {
  let offsetTimeDay;
  if (jobStatusDesc) {
    if (JOB_STATUS_DESC_NEWEST == jobStatusDesc) {
      offsetTimeDay = 7; // actual <7
    } else {
      offsetTimeDay = -1;
    }
  } else {
    if (lastModifyTime) {
      offsetTimeDay = dayjs().diff(dayjs(lastModifyTime), "day");
    } else {
      lastModifyTime = -1;
    }
  }
  return (
    "background-color: " + getTimeColorByOffsetTimeDay(offsetTimeDay) + ";"
  );
}

function getTimeColorByOffsetTimeDay(offsetTimeDay) {
  if (offsetTimeDay >= 0) {
    if (offsetTimeDay <= 7) {
      return "yellowgreen";
    } else if (offsetTimeDay <= 14) {
      return "green";
    } else if (offsetTimeDay <= 28) {
      return "orange";
    } else if (offsetTimeDay <= 56) {
      return "red";
    } else {
      return "gray";
    }
  } else {
    return "black";
  }
}

export function setupSortJobItem(node) {
  if (!node) return;
  node.style = "display:flex;flex-direction: column;";
  //for 51job
  const jobListItemList = node.querySelectorAll(".joblist-item");
  if (jobListItemList && jobListItemList.length > 0) {
    for (let i = 0; i < jobListItemList.length; i++) {
      let item = jobListItemList[i];
      item.classList.add("__51JOB_job_item");
    }
  }
  //for zhilian
  const paginationNode = node.querySelector(".pagination");
  if (paginationNode) {
    paginationNode.style = "order:99999;";
  }
}

export function renderSortJobItem(list, getListItem, { platform, orderStartIndex }) {
  if (orderStartIndex == undefined) {
    orderStartIndex = 0;
  }
  const idAndSortIndexMap = new Map();
  //设置一个标识id,renderSortCustomId
  list.forEach((item, index) => {
    item.renderSortCustomId = index;
  });
  const sortList = JSON.parse(JSON.stringify(list));
  //sort firstBrowseDatetime
  sortList.sort((o1, o2) => {
    return (
      dayjs(o2.firstBrowseDatetime ?? null).valueOf() -
      dayjs(o1.firstBrowseDatetime ?? null).valueOf()
    );
  });
  //handle hr active time
  if (platform == PLATFORM_BOSS || platform == PLATFORM_LIEPIN) {
    sortList.forEach((item) => {
      let hrActiveTimeOffsetTime = convertHrActiveTimeDescToOffsetTime(
        item.hrActiveTimeDesc
      );
      item.hrActiveTimeOffsetTime = hrActiveTimeOffsetTime;
    });
    sortList.sort((o1, o2) => {
      return o1.hrActiveTimeOffsetTime - o2.hrActiveTimeOffsetTime;
    });
  }
  if (platform == PLATFORM_BOSS) {
    sortList.sort((o1, o2) => {
      if (o2.jobStatusDesc && o1.jobStatusDesc) {
        return o1.jobStatusDesc.order - o2.jobStatusDesc.order;
      } else {
        return 0;
      }
    });
  } else {
    //sort firstPublishTime
    sortList.sort((o1, o2) => {
      return (
        dayjs(o2.jobFirstPublishDatetime ?? null).valueOf() -
        dayjs(o1.jobFirstPublishDatetime ?? null).valueOf()
      );
    });
  }
  sortList.forEach((item, index) => {
    idAndSortIndexMap.set(item.renderSortCustomId, index);
  });
  list.forEach((item, index) => {
    const dom = getListItem(index);
    let targetDom;
    if (platform) {
      if (PLATFORM_JOBSDB == platform) {
        targetDom = dom.parentNode.parentNode;
      } else {
        targetDom = dom;
      }
    } else {
      targetDom = dom;
    }
    let styleString =
      "order:" + (idAndSortIndexMap.get(item.renderSortCustomId) + orderStartIndex) + ";";
    targetDom.style = styleString;
  });
}

function convertHrActiveTimeDescToOffsetTime(hrActiveTimeDesc) {
  //按偏移量按毫秒算
  let offsetTime;
  const halfYear = 86400000 * 30 * 6;
  const oneYear = 86400000 * 30 * 6 * 2;
  if (hrActiveTimeDesc) {
    let coefficient;
    if (
      hrActiveTimeDesc.includes("刚刚") ||
      hrActiveTimeDesc.includes("当前")
    ) {
      offsetTime = 0;
    } else if (
      hrActiveTimeDesc.includes("分") ||
      hrActiveTimeDesc.includes("时") ||
      hrActiveTimeDesc.includes("日") ||
      hrActiveTimeDesc.includes("周") ||
      hrActiveTimeDesc.includes("月")
    ) {
      if (hrActiveTimeDesc.includes("分")) {
        coefficient = 60000;
      } else if (hrActiveTimeDesc.includes("时")) {
        coefficient = 3600000;
      } else if (hrActiveTimeDesc.includes("日")) {
        coefficient = 86400000;
      } else if (hrActiveTimeDesc.includes("周")) {
        coefficient = 86400000 * 7;
      } else {
        coefficient = 86400000 * 30;
      }
      let groups = hrActiveTimeDesc.match(ACTIVE_TIME_MATCH).groups;
      if (groups) {
        let num = groups.num;
        if (num) {
          offsetTime = Number.parseInt(num) * coefficient;
        } else {
          //没有数字，只有本字，如：本周
          offsetTime = 1 * coefficient;
        }
      }
    } else if (hrActiveTimeDesc.includes("半年前")) {
      offsetTime = halfYear;
    } else if (hrActiveTimeDesc.includes("近半年")) {
      offsetTime = halfYear + 86400000;
    } else {
      offsetTime = oneYear;
    }
  } else {
    offsetTime = oneYear;
  }
  return offsetTime;
}



export function renderFunctionPanel(
  list,
  getListItem,
  { platform, getCompanyInfoFunction } = {}
) {
  stopAndCleanAbortFunctionHandler();
  list.forEach((item, index) => {
    const dom = getListItem(index);
    let targetDom;
    if (platform) {
      if (PLATFORM_JOBSDB == platform) {
        targetDom = dom.parentNode.parentNode;
      } else {
        targetDom = dom;
      }
    } else {
      targetDom = dom;
    }
    let functionPanelDiv = document.createElement("div");
    functionPanelDiv.classList.add(`__${platform}_function_panel`);
    targetDom.append(functionPanelDiv);
    functionPanelDiv.onclick = (event) => {
      event.stopPropagation();
    };
    functionPanelDiv.appendChild(createLogo());
    functionPanelDiv.appendChild(
      createCompanyInfo(item, {
        getCompanyInfoFunction: getCompanyInfoFunction,
        platform
      })
    );
    functionPanelDiv.appendChild(createCommentWrapper(item));
  });
}

export function createLogo() {
  let logo = document.createElement("img");
  logo.src = "data:image/png;base64," + logoBase64;
  logo.classList.add("__logo_in_function_panel");
  return logo;
}

function createCommentWrapper(jobDTO) {
  let jobId = jobDTO.jobId;
  let commentWrapperDiv = document.createElement("div");
  commentWrapperDiv.id = "wrapper" + jobId;
  commentWrapperDiv.appendChild(createBrowseDetail(jobDTO));
  commentWrapperDiv.appendChild(createFirstBrowse(jobDTO));
  return commentWrapperDiv;
}

function createBrowseDetail(jobDTO) {
  let browseDetailTag = document.createElement("div");
  browseDetailTag.textContent += `【查看过${jobDTO.browseDetailCount ?? 0}次】`;
  browseDetailTag.classList.add("__first_browse_time");
  return browseDetailTag;
}

function createFirstBrowse(jobDTO) {
  let firstBrowseTimeTag = document.createElement("div");
  let firstBrowseTimeHumanReadable = convertTimeOffsetToHumanReadable(
    jobDTO.createDatetime
  );
  firstBrowseTimeTag.textContent +=
    "【" +
    firstBrowseTimeHumanReadable +
    "展示过(共" +
    jobDTO.browseCount +
    "次)】";
  firstBrowseTimeTag.classList.add("__first_browse_time");
  return firstBrowseTimeTag;
}

function createCompanyInfo(item, { getCompanyInfoFunction, platform } = {}) {
  const dom = document.createElement("div");
  dom.className = "__company_info_quick_search";
  let mainChannelDiv = document.createElement("div");
  let otherChannelDiv = document.createElement("div");
  let quickSearchButton = document.createElement("div");
  quickSearchButton.className = "__company_info_quick_search_button";
  quickSearchButton.textContent = "🔎点击快速查询公司信息";
  let fixValidHummanButton = document.createElement("a");
  fixValidHummanButton.className = "__company_info_quick_search_button";
  fixValidHummanButton.target = "_blank";
  fixValidHummanButton.ref = "noopener noreferrer";
  let quickSearchButtonLoading = document.createElement("div");
  quickSearchButtonLoading.className = "__company_info_quick_search_button";
  const quickSearchHandle = async (forceSyncData) => {
    try {
      if (mainChannelDiv.contains(fixValidHummanButton)) {
        mainChannelDiv.removeChild(fixValidHummanButton);
      }
      quickSearchButtonLoading.textContent = `🔎正查询公司全称⌛︎`;
      if (mainChannelDiv.contains(quickSearchButton)) {
        mainChannelDiv.removeChild(quickSearchButton);
      }
      mainChannelDiv.appendChild(quickSearchButtonLoading);
      let companyName = item.jobCompanyName;
      companyName = companyNameConvert(companyName)
      fixValidHummanButton.textContent =
        "一直查询失败？点击该按钮去尝试解除人机验证吧！";
      if (getCompanyInfoFunction) {
        let targetCompanyName = await getCompanyInfoFunction(
          item.jobCompanyApiUrl
        );
        if (targetCompanyName) {
          targetCompanyName = companyNameConvert(targetCompanyName);
          if (companyName == targetCompanyName) {
            infoLog(`company name equal = ${companyName}`);
          } else {
            companyName = targetCompanyName;
            infoLog(`old company name = ${item.jobCompanyName}`);
            item.jobCompanyName = companyNameConvert(companyName);
            infoLog(`new company name = ${item.jobCompanyName}`);
            //将更新时间置空， 以新记录形式更新
            item.updateDatetime = null;
            //补全公司名后，调整公司全称标记
            item.isFullCompanyName = true;
            await JobApi.batchAddOrUpdateJob([item]);
            infoLog(`update job.id = ${item.jobId}`);
          }
        } else {
          fixValidHummanButton.textContent = `找不到【${companyName}】的全称，点击该按钮去看看有没有相关记录`;
        }
      }
      const decode = encodeURIComponent(companyName);
      const url = `https://aiqicha.baidu.com/s?q=${decode}`;
      fixValidHummanButton.href = url;
      otherChannelDiv.replaceChildren();
      try {
        quickSearchButtonLoading.textContent = `🔎正查询【${companyName}】⌛︎`;
        await asyncRenderCompanyInfo(
          mainChannelDiv,
          companyName,
          forceSyncData,
          quickSearchHandle
        );
        mainChannelDiv.removeChild(quickSearchButtonLoading);
      } catch (e) {
        mainChannelDiv.removeChild(quickSearchButtonLoading);
        quickSearchButton.textContent = `🔎查询【${companyName}】失败，点击重新查询`;
        mainChannelDiv.appendChild(quickSearchButton);
        mainChannelDiv.appendChild(fixValidHummanButton);
      } finally {
        let reputationWrapperDiv = document.createElement("div");
        let companyTagWrapperDiv = document.createElement("div");
        otherChannelDiv.appendChild(reputationWrapperDiv);
        otherChannelDiv.appendChild(companyTagWrapperDiv);
        companyTagWrapperDiv.append(createCompanyTag(companyName))
        reputationWrapperDiv.append(createCompanyReputation(companyName, () => {
          clearAllChildNode(companyTagWrapperDiv);
          companyTagWrapperDiv.append(createCompanyTag(companyName));
        }));
        otherChannelDiv.appendChild(createSearchCompanyLink(companyName));
        let companyIdSha256 = genIdFromText(companyName);
        let commentWrapperDiv = document.createElement("div");
        commentWrapperDiv.className = `__comment_wrapper __${platform}_comment_wrapper`
        let companyCommentButton = genCommentTextButton(
          commentWrapperDiv,
          "查看公司评论💬",
          companyName,
          companyIdSha256
        );
        commentWrapperDiv.appendChild(companyCommentButton);
        otherChannelDiv.append(commentWrapperDiv);
      }
    } catch (e) {
      errorLog(e);
    }
  };
  quickSearchButton.onclick = () => {
    quickSearchHandle(false);
  };
  mainChannelDiv.appendChild(quickSearchButton);
  dom.appendChild(mainChannelDiv);
  dom.appendChild(otherChannelDiv);
  if (getCompanyInfoFunction) {
    //for boss,liepin
    //skip
  } else {
    //自动查询公司信息
    quickSearchHandle(false);
  }
  return dom;
}

async function asyncRenderCompanyInfo(
  div,
  keyword,
  forceSyncData,
  quickSearchHandle
) {
  try {
    let convertedCompanyName = companyNameConvert(keyword);
    //查询数据库是否有公司信息
    let company = await CompanyApi.getCompanyById(
      genSha256(convertedCompanyName) + ""
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
      let companyInfo = await getCompanyInfoByAiqicha(keyword);
      company = await getCompanyFromCompanyInfo(companyInfo, convertedCompanyName);
    }
    div.appendChild(createCompanyInfoDetail(company, quickSearchHandle));
  } catch (e) {
    errorLog(e);
    throw e;
  }
}

/**
 *
 * @param {Company} company
 * @returns
 */
export function createCompanyInfoDetail(company, quickSearchHandle) {
  let contentDiv = $("<div></div>");
  contentDiv.append(
    $(`<div class="__company_info_quick_search_item"></div>`)
      .append(
        $(
          `<div><div class="__company_info_quick_search_item_label">公司名：</div><div class="__company_info_quick_search_item_value">${company.companyName}</div></div>`
        )
      )
      .append(
        $(
          `<div><div class="__company_info_quick_search_item_label">成立时间：</div><div>
          ${dayjs(company.companyStartDate).format(
            "YYYY-MM-DD"
          )}(${convertTimeOffsetToHumanReadable(
            dayjs(company.companyStartDate)
          )})
          </div></div>`
        )
      )
      .append(
        $(
          `<div><div class="__company_info_quick_search_item_label">经营状态：</div>${company.companyStatus}</div>`
        )
      )
  );
  let websiteElement = null;
  if (company.companyWebSite && company.companyWebSite.length > 1) {
    websiteElement = `<a href="${autoFillHttp(
      company.companyWebSite
    )}" target = "_blank"; ref = "noopener noreferrer">${company.companyWebSite
      }</a>`;
  } else {
    websiteElement = "-";
  }
  contentDiv.append(
    $(`<div class="__company_info_quick_search_item"></div>`)
      .append(
        $(
          `<div><div class="__company_info_quick_search_item_label">法人：</div>${company.companyLegalPerson}</div>`
        )
      )
      .append(
        $(
          `<div><div class="__company_info_quick_search_item_label">统一社会信用代码：</div>${company.companyUnifiedCode}</div>`
        )
      )
  );
  let websiteStatusElement = $(`<div></div>`);
  renderWebsiteStatus(websiteStatusElement[0], company.companyWebSite);
  let websiteWhoisElement = $(`<div></div>`);
  renderWebsiteWhois(websiteWhoisElement[0], company.companyWebSite);
  let websiteIpcElement = $(`<div></div>`);
  renderWebsiteIpc(websiteIpcElement[0], company.companyWebSite);
  contentDiv.append(
    $(`<div class="__company_info_quick_search_item"></div>`).append(
      $(
        `<div><div class="__company_info_quick_search_item_label">官网：</div>${websiteElement}</div>`
      ),
      $(
        `<div><div class="__company_info_quick_search_item_label">状态：</div></div>`
      ).append(websiteStatusElement),
      $(
        `<div><div class="__company_info_quick_search_item_label">建站时间：</div></div>`
      ).append(websiteWhoisElement),
      $(`<div></div>`).append(websiteIpcElement)
    )
  );
  contentDiv.append(
    $(`<div class="__company_info_quick_search_item"></div>`)
      .append(
        $(
          `<div><div class="__company_info_quick_search_item_label">社保人数：</div>${company.companyInsuranceNum ?? "-"
          }</div>`
        )
      )
      .append(
        $(
          `<div><div class="__company_info_quick_search_item_label">自身风险数：</div>${company.companySelfRisk}</div>`
        )
      )
      .append(
        $(
          `<div><div class="__company_info_quick_search_item_label">关联风险数：</div>${company.companyUnionRisk}</div>`
        )
      )
  );
  contentDiv.append(
    $(`<div class="__company_info_quick_search_item"></div>`).append(
      $(
        `<div><div class="__company_info_quick_search_item_label">地址：</div><div class="__company_info_quick_search_item_value">${company.companyAddress}</div></div>`
      )
    )
  );
  let syncDataButton = document.createElement("div");
  syncDataButton.className = "__company_info_quick_search_button";
  syncDataButton.textContent = "📥立即同步数据";
  syncDataButton.onclick = () => {
    contentDiv[0].parentElement.removeChild(contentDiv[0]);
    quickSearchHandle(true);
  };
  contentDiv.append(
    $(`<div class="__company_info_quick_search_item"></div>`)
      .append(
        $(
          `<div><div class="__company_info_quick_search_item_label">数据来源：</div><div class="__company_info_quick_search_item_value"><a href="${company.sourceUrl}" target = "_blank"; ref = "noopener noreferrer">${company.sourceUrl}</a></div></div>`
        )
      )
  );
  contentDiv.append(
    $(
      `<div class="__company_info_quick_search_item"><div class="__company_info_quick_search_item_label">数据同步时间：</div><div class="__company_info_quick_search_item_value">${convertTimeOffsetToHumanReadable(
        company.updateDatetime
      )}</div></div>`
    ).append(syncDataButton));
  return contentDiv[0];
}

async function renderWebsiteIpc(element, website) {
  try {
    element.onclick = null;
    element.textContent = "备案信息检测中⌛︎";
    element.className = "__website_value_loading";
    if (website.length <= 1) {
      //找不到网址，会显示-符号
      element.textContent = "";
      element.className = "";
    } else {
      let abortFunctionHandler = null;
      let url = `https://icp.aizhan.com/${encodeURIComponent(
        getDomain(website)
      )}/`;
      const result = await httpFetchGetText(url, (abortFunction) => {
        abortFunctionHandler = abortFunction;
        //加入请求手动中断列表
        addAbortFunctionHandler(abortFunctionHandler);
      });
      //请求正常结束，从手动中断列表中移除
      deleteAbortFunctionHandler(abortFunctionHandler);
      let firstMatchArray = result.match(
        /<table class="table">[\s\S]*<tr><td class="thead">主办单位名称<\/td><td>.*[<\td>]?/
      );
      if (firstMatchArray && firstMatchArray.length > 0) {
        let groups = firstMatchArray[0]
          ?.replaceAll("\n", "")
          ?.replaceAll("\t", "")
          ?.replaceAll(" ", "")
          ?.replaceAll("&nbsp;", "")
          ?.match(
            /<tr>(?<name>.*?)<\/tr><tr>(?<type>.*?)<\/tr><tr>(?<ipc>.*?)<\/tr>/
          )?.groups;
        if (groups) {
          let name = groups.name.match(/<td>(?<name>.*)<a/).groups.name;
          let type = groups.type.match(/<td>(?<type>.*)<\/td>/).groups.type;
          let ipc = groups.ipc.match(/<span>(?<ipc>.*)<\/span>/).groups.ipc;
          element.textContent = "";
          element.className = "";
          element.className = "__company_info_quick_search_sub_item";
          element.title = `${name}(性质：${type})`;
          let rootElement = $(element);
          rootElement.append(
            $(
              `<div class="__company_info_quick_search_item_label">备案：</div><div class="__company_info_quick_search_item_value">${ipc}</div>`
            )
          );
          return;
        }
      }
      clearAllChildNode(element);
      element.className = "";
      let syncDataButton = document.createElement("div");
      syncDataButton.className = "__company_info_quick_search_button";
      syncDataButton.textContent = "🔎未找到备案信息，点击到工信部核实";
      syncDataButton.onclick = () => {
        window.open("https://beian.miit.gov.cn/#/Integrated/recordQuery");
      };
      element.appendChild(syncDataButton);
    }
  } catch (e) {
    errorLog(e);
    element.onclick = (event) => {
      renderWebsiteIpc(element, website);
    };
    element.textContent = "备案信息检测失败，点击重新检测";
    element.className = "__website_value_loading";
  }
}

async function renderWebsiteWhois(element, website) {
  try {
    element.onclick = null;
    element.textContent = "检测中⌛︎";
    element.className = "__website_value_loading";
    if (website.length <= 1) {
      //找不到网址，会显示-符号
      element.textContent = "-";
      element.className = "";
    } else {
      let abortFunctionHandler = null;
      let url = `https://whois.chinaz.com/${encodeURIComponent(website)}`;
      const result = await httpFetchGetText(url, (abortFunction) => {
        abortFunctionHandler = abortFunction;
        //加入请求手动中断列表
        addAbortFunctionHandler(abortFunctionHandler);
      });
      //请求正常结束，从手动中断列表中移除
      deleteAbortFunctionHandler(abortFunctionHandler);
      let groups = result.match(
        /注册时间[\s\S]*<\/div>[\s\S]*<div item-value>(?<registDate>.*)<\/div>[\s\S]*/
      )?.groups;
      if (groups && groups.registDate) {
        let date = dayjs(
          groups.registDate
            .replaceAll("年", "-")
            .replaceAll("月", "-")
            .replaceAll("日", "")
        );
        element.textContent = convertTimeOffsetToHumanReadable(date);
        element.title = date.format("YYYY-MM-DD");
        element.className = "";
      } else {
        element.textContent = "未找到";
        element.clasName = "__website_value_error";
      }
    }
  } catch (e) {
    errorLog(e);
    element.onclick = (event) => {
      renderWebsiteWhois(element, website);
    };
    element.textContent = "检测失败，点击重新检测";
    element.className = "__website_value_loading";
  }
}

async function renderWebsiteStatus(element, website) {
  try {
    element.onclick = null;
    element.textContent = "检测中⌛︎";
    element.className = "__website_value_loading";
    if (website.length <= 1) {
      //找不到网址，会显示-符号
      element.textContent = "-";
      element.className = "";
    } else {
      let abortFunctionHandler = null;
      let url = `${autoFillHttp(website)}`;
      await httpFetchGetText(url, (abortFunction) => {
        abortFunctionHandler = abortFunction;
        //加入请求手动中断列表
        addAbortFunctionHandler(abortFunctionHandler);
      });
      //请求正常结束，从手动中断列表中移除
      deleteAbortFunctionHandler(abortFunctionHandler);
      element.textContent = "可访问";
      element.style = "background-color:yellowgreen;color:white;";
    }
  } catch (e) {
    errorLog(e);
    element.onclick = (event) => {
      renderWebsiteStatus(element, website);
    };
    element.textContent = "不可访问";
    element.className = "__website_value_loading";
  }
}

export function createSearchCompanyLink(keyword) {
  const decode = encodeURIComponent(keyword);
  const dom = document.createElement("div");
  const internetDiv = document.createElement("div");
  internetDiv.className =
    "__company_info_quick_search_item __company_info_other_channel";
  let internetLabelDiv = document.createElement("div");
  internetLabelDiv.className = "__company_info_quick_search_item_label";
  internetLabelDiv.textContent = " - 互联网渠道";
  internetDiv.appendChild(
    createATagWithSearch(`https://aiqicha.baidu.com/s?q=${decode}`, "爱企查")
  );
  internetDiv.appendChild(
    createATagWithSearch(
      `https://www.xiaohongshu.com/search_result?keyword=${decode}`,
      "小红书"
    )
  );
  internetDiv.appendChild(
    createATagWithSearch(
      `https://maimai.cn/web/search_center?type=feed&query=${decode}&highlight=true`,
      "脉脉"
    )
  );
  internetDiv.appendChild(
    createATagWithSearch(`https://www.bing.com/search?q=${decode}`, "必应")
  );
  internetDiv.appendChild(
    createATagWithSearch(`https://www.google.com/search?q=${decode}`, "Google")
  );
  internetDiv.appendChild(internetLabelDiv);
  dom.appendChild(internetDiv);
  const govDiv = document.createElement("div");
  govDiv.className =
    "__company_info_quick_search_item __company_info_other_channel";
  let govLabelDiv = document.createElement("div");
  govLabelDiv.className = "__company_info_quick_search_item_label";
  govLabelDiv.textContent = "- 政府渠道";
  govDiv.appendChild(
    createATagWithSearch(
      `https://beian.miit.gov.cn/#/Integrated/recordQuery`,
      "工信部"
    )
  );
  govDiv.appendChild(
    createATagWithSearch(
      `https://www.creditchina.gov.cn/xinyongxinxixiangqing/xyDetail.html?keyword=${decode}`,
      "信用中国"
    )
  );
  govDiv.appendChild(
    createATagWithSearch(
      `https://www.gsxt.gov.cn/corp-query-homepage.html`,
      "企业信用"
    )
  );
  govDiv.appendChild(
    createATagWithSearch(`http://zxgk.court.gov.cn/zhzxgk/`, "执行信息")
  );
  govDiv.appendChild(
    createATagWithSearch(`https://wenshu.court.gov.cn/`, "裁判文书")
  );
  govDiv.appendChild(
    createATagWithSearch(`https://xwqy.gsxt.gov.cn/`, "个体私营")
  );
  govDiv.appendChild(govLabelDiv);
  dom.appendChild(govDiv);
  return dom;
}

export function createCompanyTag(companyName) {
  const dom = document.createElement("div");
  dom.className = "__company_info_quick_search_item";
  let labelDiv = document.createElement("div");
  labelDiv.className = "__company_info_quick_search_item_label";
  labelDiv.textContent = "公司标签：";
  dom.appendChild(labelDiv);
  const tagDiv = document.createElement("div");
  tagDiv.className = "__company_tag";
  dom.appendChild(tagDiv);
  asyncRenderTag(tagDiv, companyName);
  return dom;
}

async function asyncRenderTag(div, companyName) {
  let inputReadOnly = true;
  let input = document.createElement("input");
  div.appendChild(input);
  let tagify = new Tagify(input, {
    transformTag: transformTag,
    dropdown: {
      maxItems: 20,           // <- mixumum allowed rendered suggestions
      classname: 'tags-look', // <- custom classname for this dropdown, so it could be targeted
      enabled: 0,             // <- show suggestions on focus
      closeOnSelect: false    // <- do not hide the suggestions dropdown once an item has been selected
    }
  });
  //get company tag
  let companyId = genIdFromText(companyName);
  let companyTagArray = await CompanyApi.getAllCompanyTagDTOByCompanyId(companyId);
  companyTagArray.forEach(item => {
    tagify.addTags(item.tagName);
  });
  let dragsort = new DragSort(tagify.DOM.scope, {
    selector: '.' + tagify.settings.classNames.tag,
    callbacks: {
      dragEnd: (elem) => {
        tagify.updateValueByDOMTags();
      }
    }
  });
  tagify.setReadonly(true);
  //add tag to tagify
  let operationButton = document.createElement("div");
  operationButton.className = "__company_info_quick_search_button";
  operationButton.textContent = "📝编辑"
  div.append(operationButton);
  let saving = false;
  operationButton.addEventListener("click", async () => {
    if (saving) return;
    inputReadOnly = !inputReadOnly;
    if (inputReadOnly) {
      //禁用 operationButton 的点击事件
      saving = true;
      operationButton.textContent = "公司标签保存中⌛︎";
      tagify.setReadonly(true);
      //save company tag
      let value = tagify.getInputValue();
      let result = [];
      if (value) {
        result = JSON.parse(tagify.getInputValue());
      }
      let tags = [];
      result.forEach((item) => {
        tags.push(item.value);
      })
      let param = new CompanyTagBO();
      param.companyName = companyName;
      param.tags = tags;
      await CompanyApi.addOrUpdateCompanyTag(param)
      operationButton.textContent = "📝编辑";
      tagify.setReadonly(true);
      saving = false;
    } else {
      let allTags = await TagApi.getAllTag();
      let tagItems = [];
      allTags.forEach(item => {
        tagItems.push(item.tagName);
      });
      tagify.whitelist = tagItems;
      operationButton.textContent = "✅保存";
      tagify.setReadonly(false);
      tagify.DOM.input.focus();
    }
  });
}

// generate a random color (in HSL format, which I like to use)
function getRandomColor() {
  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  let h = rand(1, 360) | 0,
    s = rand(40, 70) | 0,
    l = rand(65, 72) | 0;

  return 'hsl(' + h + ',' + s + '%,' + l + '%)';
}

function transformTag(tagData) {
  tagData.color = getRandomColor();
  tagData.style = "--tag-bg:" + tagData.color;
}

export function createCompanyReputation(keyword, companyTagUpdateCallback) {
  const dom = document.createElement("div");
  dom.className = "__company_info_quick_search_item";
  let labelDiv = document.createElement("div");
  labelDiv.className = "__company_info_quick_search_item_label";
  labelDiv.textContent = "公司风评检测：";
  dom.appendChild(labelDiv);
  let contentDiv = document.createElement("div");
  contentDiv.className = "__company_reputation_content";
  dom.appendChild(contentDiv);
  contentDiv.appendChild(genCompanyCheckingElement(keyword, companyTagUpdateCallback, {
    title: "信用中国(北京)黑名单",
    sourceTitle: "信息来源:信用中国(北京) https://creditbj.jxj.beijing.gov.cn/credit-portal/",
    sourceUrl: `https://creditbj.jxj.beijing.gov.cn/credit-portal/credit_service/publicity/record/black`,
    companyTag: TAG_CREDIT_BJ_BLACK_LIST,
    searchFunction: async (keyword) => {
      return await httpFetchJsonWithAbort({
        url: `https://creditbj.jxj.beijing.gov.cn/credit-portal/api/publicity/record/BLACK/0`,
        body: { "listSql": "", "linesPerPage": 50, "currentPage": 1, "condition": { "keyWord": keyword, "creditObjectType": "0" } }
      });
    },
    handleSearchCount: (result) => {
      if (result.status == "1200") {
        let count = 0;
        let totalNum = (result?.data?.page?.totalNum) ?? 0;
        if (totalNum > 0) {
          count = result?.data?.list?.filter(item => item.zzmc == keyword).length;
        }
        return count;
      } else {
        throw `${result.message}`
      }
    },
  }));
  contentDiv.appendChild(genCompanyCheckingElement(keyword, companyTagUpdateCallback, {
    title: "若比邻黑名单",
    sourceTitle: "信息来源:跨境小白网（若比邻网）https://kjxb.org/",
    sourceUrl: `https://kjxb.org/?s=${encodeURIComponent(keyword)}&post_type=question`,
    companyTag: TAG_RUOBILIN_BLACK_LIST,
    searchFunction: async (keyword) => {
      return await httpFetchGetTextWithAbort(`https://kjxb.org/?s=${encodeURIComponent(keyword)}&post_type=question`);
    },
    handleSearchCount: (result) => {
      let hyperlinks = $(result).find(".ap-questions-hyperlink");
      return hyperlinks ? hyperlinks.length : 0;
    },
  }));
  contentDiv.appendChild(genCompanyCheckingElement(keyword, companyTagUpdateCallback, {
    title: "互联网企业黑名单",
    sourceTitle: "信息来源:互联网企业黑名单 https://job.me88.top/",
    sourceUrl: `https://job.me88.top/index.php/search/${encodeURIComponent(keyword)}`,
    companyTag: TAG_IT_BLACK_LIST,
    searchFunction: async (keyword) => {
      return await httpFetchGetTextWithAbort(`https://job.me88.top/index.php/search/${encodeURIComponent(keyword)}`);
    },
    handleSearchCount: (result) => {
      let hyperlinks = $(result).find("div[class=\"post-box paddingall\"]");
      return hyperlinks ? hyperlinks.length : 0;
    },
  }));
  contentDiv.appendChild(genCompanyCheckingElement(keyword, companyTagUpdateCallback, {
    title: "IT黑名单",
    sourceTitle: "信息来源:IT黑名单 http://www.blackdir.com/",
    sourceUrl: `http://www.blackdir.com/?search=${encodeURIComponent(keyword)}`,
    companyTag: TAG_IT_BLACK_LIST_2,
    searchFunction: async (keyword) => {
      return await httpFetchGetTextWithAbort(`http://www.blackdir.com/?search=${encodeURIComponent(keyword)}`);
    },
    handleSearchCount: (result) => {
      let hyperlinks = $(result).find("div[class=\"media\"]")
      return hyperlinks ? hyperlinks.length : 0;
    },
  }));
  return dom;
}

function genCompanyCheckingElement(keyword, companyTagUpdateCallback, {
  title,
  sourceTitle,
  sourceUrl,
  companyTag,
  searchFunction,
  handleSearchCount,
}) {
  const result = document.createElement("div");
  asyncRenderCompanyChecking(result, keyword, companyTagUpdateCallback, {
    title,
    sourceTitle,
    sourceUrl,
    companyTag,
    searchFunction,
    handleSearchCount,
  });
  return result;
}

async function asyncRenderCompanyChecking(div, keyword, companyTagUpdateCallback, {
  title,
  sourceTitle,
  sourceUrl,
  companyTag,
  searchFunction,
  handleSearchCount,
}) {
  div.title = sourceTitle
  const loaddingTag = createATag(
    "📡",
    sourceUrl,
    `${title}(检测中⌛︎)`,
    (event) => {
      clearAllChildNode(div);
      asyncRenderCompanyChecking(div, keyword, companyTagUpdateCallback, {
        title,
        sourceTitle,
        sourceUrl,
        companyTag,
        searchFunction,
        handleSearchCount,
      });
    }
  );
  div.appendChild(loaddingTag);
  renderCompanyReputationColor(loaddingTag, "black");
  try {
    const result = await searchFunction(keyword)
    let count = handleSearchCount(result);
    clearAllChildNode(div);
    if (count > 0) {
      //存在于黑名单
      let tag = createATag("📡", sourceUrl, `${title}(疑似${count}条记录)`);
      div.appendChild(tag);
      renderCompanyReputationColor(tag, "red");
      await addCompanyTagNotExists(keyword, [companyTag]);
      companyTagUpdateCallback();
    } else {
      //不存在
      let tag = createATag("📡", sourceUrl, `${title}(无记录)`);
      div.appendChild(tag);
      renderCompanyReputationColor(tag, "yellowgreen");
    }
  } catch (e) {
    errorLog(e);
    clearAllChildNode(div);
    const errorDiv = createATag(
      "📡",
      sourceUrl,
      `${title}(检测失败，点击重新检测)`,
      (event) => {
        clearAllChildNode(div);
        asyncRenderCompanyChecking(div, keyword, companyTagUpdateCallback, {
          title,
          sourceTitle,
          sourceUrl,
          companyTag,
          searchFunction,
          handleSearchCount,
        });
      }
    );
    errorDiv.href = "javaScript:void(0);";
    errorDiv.target = "";
    div.appendChild(errorDiv);
    renderCompanyReputationColor(errorDiv, "black");
  }
}

async function httpFetchJsonWithAbort({ url, body, method, headers, referrer, referrerPolicy }) {
  let abortFunctionHandler = null;
  if (!headers) {
    headers = {
      "Accept": "application/json",
      "Content-Type": "application/json"
    }
  }
  const result = await httpFetchJson({ url, body: JSON.stringify(body), method: method ?? "POST", headers, referrer, referrerPolicy }, (abortFunction) => {
    abortFunctionHandler = abortFunction;
    //加入请求手动中断列表
    addAbortFunctionHandler(abortFunctionHandler);
  });
  //请求正常结束，从手动中断列表中移除
  deleteAbortFunctionHandler(abortFunctionHandler);
  return result;
}

async function httpFetchGetTextWithAbort(url) {
  let abortFunctionHandler = null;
  const result = await httpFetchGetText(url, (abortFunction) => {
    abortFunctionHandler = abortFunction;
    //加入请求手动中断列表
    addAbortFunctionHandler(abortFunctionHandler);
  });
  //请求正常结束，从手动中断列表中移除
  deleteAbortFunctionHandler(abortFunctionHandler);
  return result;
}

export function clearAllChildNode(div) {
  div.replaceChildren();
}

function renderCompanyReputationColor(div, color) {
  div.style = `background-color:${color};color:white`;
}

function createATagWithSearch(url, label) {
  return createATag("🔎", url, label);
}

function createATag(emoji, url, label, callback) {
  let aTag = document.createElement("a");
  aTag.href = url;
  aTag.target = "_blank";
  aTag.ref = "noopener noreferrer";
  aTag.textContent = emoji + label;
  aTag.addEventListener("click", (event) => {
    if (callback) {
      callback(event);
    }
    event.stopPropagation();
  });
  return aTag;
}
