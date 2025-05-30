import dayjs from "dayjs";
import minMax from "dayjs/plugin/minMax";
import {
  PLATFORM_BOSS,
  PLATFORM_JOBSDB,
  PLATFORM_LIEPIN,
  TAG_CREDIT_BJ_BLACK_LIST,
  TAG_IT_BLACK_LIST,
  TAG_IT_BLACK_LIST_2,
  TAG_RUOBILIN_BLACK_LIST,
  TAG_SOURCE_TYPE_CUSTOM,
} from "../../common";
import { httpFetchGetText, httpFetchJson } from "../../common/api/common";
import { isOutsource } from "../../common/data/outsource";
import { isTraining } from "../../common/data/training";
import {
  autoFillHttp,
  convertTimeOffsetToHumanReadable,
  convertTimeToHumanReadable,
  genIdFromText,
  genUniqueId,
  getDomain,
  dateToStr,
  convertNumberToHumanReadable,
} from "../../common/utils";
import {
  JOB_STATUS_DESC_NEWEST
} from "./common";
import {
  addAbortFunctionHandler,
  addCompanyTagNotExists,
  companyNameConvert,
  deleteAbortFunctionHandler,
  genSha256,
  getCompanyFromCompanyInfo,
  getCompanyInfoByAiqicha,
  stopAndCleanAbortFunctionHandler,
} from "./commonDataHandler";
dayjs.extend(minMax);

import $ from "jquery";
import { AuthApi, CompanyApi, CompanyCommentApi, JobApi, UserApi } from "../../common/api";
import { GithubApi } from "../../common/api/github";
import { COMMENT_PAGE_SIZE, COMPANY_DATA_EXPRIE_DAY, UI_DEFAULT_PAGE_SIZE } from "../../common/config";
import { errorLog, infoLog } from "../../common/log";
import { logoResource } from "./assets/logo";

const ACTIVE_TIME_MATCH = /(?<num>[0-9\.]*)/;

import DragSort from '@yaireo/dragsort';
import Tagify from '@yaireo/tagify';
import { CompanyTagBO } from "../../common/data/bo/companyTagBO";

import { JobTagBO } from "../../common/data/bo/jobTagBO";

import { CONTENT_SEARCH } from "@/common/data/dto/analysisConfigDTO";
import { useTag } from "@/common/hooks/tag";
import "iconify-icon";
const { convertToTagData } = useTag();

import { useJob } from "@/common/hooks/job";
const { isAgeLimitFromDescription, isAgeLimitFromDescriptionBy35 } = useJob();
import { TcBar } from "@weblogin/trendchart-elements";

export function renderTimeTag(
  divElement,
  jobDTO,
  { jobStatusDesc, platform, analysisConfig } = {}
) {
  if (jobDTO == null || jobDTO == undefined) {
    throw new Error("jobDTO is required");
  }
  //进行年龄限制的检测
  const ageCheckCondition = `${jobDTO.jobName}${jobDTO.jobDescription}`;
  const isAgeLimit = isAgeLimitFromDescription(ageCheckCondition);
  const isAgeLimitBy35 = isAgeLimitFromDescriptionBy35(ageCheckCondition);
  if (isAgeLimit || isAgeLimitBy35) {
    const ageLimitCheckTagWrapper = document.createElement("span");
    ageLimitCheckTagWrapper.classList.add("__time_tag_age_limit");

    const ageLimitCheckTag = document.createElement("div");
    if (isAgeLimitBy35) {
      ageLimitCheckTag.textContent = `【35岁门槛】`;
      ageLimitCheckTagWrapper.classList.add("__time_tag_age_limit_35");
    } else {
      ageLimitCheckTag.textContent = `【年龄限制】`;
    }
    ageLimitCheckTag.classList.add("__time_tag_base_text_font");

    ageLimitCheckTagWrapper.appendChild(ageLimitCheckTag);
    divElement.appendChild(ageLimitCheckTagWrapper);
  }

  //对初次发现时间的处理
  const createDatetimeTagWrapper = document.createElement("span");
  createDatetimeTagWrapper.classList.add("__time_tag_create_datetime");

  const createDatetimeTag = document.createElement("div");
  createDatetimeTag.textContent = `<初见 ${convertTimeOffsetToHumanReadable(jobDTO.createDatetime)}>`;
  createDatetimeTag.classList.add("__time_tag_base_text_font");
  createDatetimeTag.classList.add("__time_tag_create_datetime_text_font");

  createDatetimeTagWrapper.appendChild(createDatetimeTag);
  divElement.appendChild(createDatetimeTagWrapper);

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
    const refreshTime = jobDTO.jobFirstPublishDatetime;
    if (refreshTime) {
      const refreshTimeTag = document.createElement("span");
      const refreshTimeHumanReadable = convertTimeToHumanReadable(refreshTime);
      refreshTimeTag.textContent += "【" + refreshTimeHumanReadable + "更新】";
      refreshTimeTag.classList.add("__time_tag_base_text_font");
      divElement.appendChild(refreshTimeTag);
    }
  } else {
    //firstPublishTime
    const firstPublishTime = jobDTO.jobFirstPublishDatetime;
    if (firstPublishTime) {
      const firstPublishTimeTag = document.createElement("span");
      const firstPublishTimeHumanReadable = convertTimeToHumanReadable(
        firstPublishTime
      );
      firstPublishTimeTag.textContent +=
        "【" + firstPublishTimeHumanReadable + "发布】";
      firstPublishTimeTag.classList.add("__time_tag_base_text_font");
      divElement.appendChild(firstPublishTimeTag);
    }
  }
  if (jobDTO.hrActiveTimeDesc) {
    const hrActiveTimeDescTag = document.createElement("span");
    hrActiveTimeDescTag.textContent = "【HR-" + jobDTO.hrActiveTimeDesc + "】";
    hrActiveTimeDescTag.classList.add("__time_tag_base_text_font");
    divElement.appendChild(hrActiveTimeDescTag);
  }
  //companyInfo
  let companyInfoTag = null;
  const companyInfoText = getCompanyInfoText(jobDTO.jobCompanyName);
  if (companyInfoText !== "") {
    companyInfoTag = document.createElement("span");
    companyInfoTag.textContent = companyInfoText;
    companyInfoTag.classList.add("__time_tag_base_text_font");
    divElement.appendChild(companyInfoTag);
  }

  //为time tag染色
  if (platform == PLATFORM_BOSS) {
    //根据hr活跃时间和职位发现时间中更早的时间为JobItem染色
    const now = dayjs();
    let minDatetime = jobDTO.createDatetime;
    if (jobDTO.hrActiveTimeDesc) {
      const hrActiveDatetime = now.subtract(
        convertHrActiveTimeDescToOffsetTime(jobDTO.hrActiveTimeDesc),
        "millisecond"
      );
      minDatetime = dayjs.min(dayjs(hrActiveDatetime), dayjs(jobDTO.createDatetime));
    }
    divElement.style = getRenderTimeStyle(minDatetime);
  } else {
    const minDatetime = dayjs.min(dayjs(jobDTO.jobFirstPublishDatetime), dayjs(jobDTO.createDatetime));
    divElement.style = getRenderTimeStyle(
      minDatetime ?? null,
      jobStatusDesc
    );
  }
  if (analysisConfig && analysisConfig.enable) {
    const source = analysisConfig.source;
    const url = analysisConfig.url;
    const model = analysisConfig.model;
    const token = analysisConfig.token;
    const auto = analysisConfig.autoAnalysisPages ? analysisConfig.autoAnalysisPages.includes(CONTENT_SEARCH) : false;
    const demand = `${jobDTO.jobName}\n${jobDTO.jobDescription}`;
    const resume = analysisConfig.resume;
    const element = document.createElement('job-analysis-element');
    element.classList.add("__job_analysis");
    element.url = url;
    element.model = model;
    element.token = token;
    element.demand = demand;
    element.resume = resume;
    element.source = source;
    element.auto = auto;
    element.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
    })
    divElement.appendChild(element);
  }

  divElement.classList.add("__time_tag_base_text_font");
}

export function finalRender(jobDTOList, { platform, isFinalRender = true, isRecommendPage }) {
  for (let i = 0; i < jobDTOList.length; i++) {
    const item = jobDTOList[i];
    const jobId = item.jobId;
    const jobItemIdSha256 = genIdFromText(jobId);
    const commentWrapperDiv = document.getElementById("wrapper" + jobId);
    const jobCardItemDom = commentWrapperDiv.parentElement.parentElement;
    if (commentWrapperDiv) {
      commentWrapperDiv.classList.add("__comment_wrapper");
      commentWrapperDiv.classList.add("__" + platform + "_comment_wrapper");
      const jobItemCommentButton = genCommentTextButton(
        commentWrapperDiv,
        "职位评论",
        item.jobName + "-" + item.jobCompanyName,
        jobItemIdSha256,
        { autoLoad: true, isRecommendPage, platform, jobCardItemDom }
      );
      commentWrapperDiv.append(jobItemCommentButton);
      // 换行
      commentWrapperDiv.appendChild($(`<div style="width:100%;"></div>`)[0]);
      if (isFinalRender && i == jobDTOList.length - 1) {
        commentWrapperDiv.appendChild($(`<div class="__status_job_render_finish"></div>`)[0]);
      }
      if (item.jobDescription) {
        jobCardItemDom.title = item.jobDescription;
      }
    }
  }
}

export function createCompanyCommentButton(keyword, keywordSha256) {
  const result = document.createElement("div");
  result.className = "__company_info_quick_search_wrapper";
  const root = $(`<div></div>`)[0];
  root.className =
    "__company_info_quick_search_item __company_info_other_channel";
  const buttonAnchorName = genUniqueId();
  const button = $(`<div class="__comment_button" style="anchor-name:--${buttonAnchorName};">公司评论</div>`)[0];
  const menu = $(`<div
    style="display:none;position-anchor: --${buttonAnchorName};max-width:50%;max-height:50%;overflow:scroll;overscroll-behavior:contain;" class="__modal"
      ></div>`)[0];
  const toggleMenu = () => {
    if (menu.style.display == "none") {
      menu.style.display = "block";
    } else {
      menu.style.display = "none";
    }
  };
  menu.addEventListener('click', toggleMenu);
  button.addEventListener('click', toggleMenu);
  root.appendChild(button);

  const badgeWrapper = $(`<div></div>`)[0];
  button.append(badgeWrapper);

  root.appendChild(menu);
  result.appendChild(root);

  const load = () => {
    renderCompanyComment({ button, badgeWrapper, menu, companyName: keyword, companyIdSha256: keywordSha256 });
  }
  load();
  return result;
}

const renderCompanyComment = async ({ button, badgeWrapper, menu, companyName, companyIdSha256 }) => {
  button.title = "加载中";
  try {
    clearAllChildNode(badgeWrapper);
    const searchResult = await queryCompanyComment({ pageNum: 1, pageSize: 0, companyIdSha256 });
    const { total } = searchResult;
    if (total > 0) {
      badgeWrapper.appendChild($(`<div class="__comment_badge __comment_badge_exists">${total}</div>`)[0]);
    } else {
      badgeWrapper.appendChild($(`<div class="__comment_badge __comment_badge_not_found">0</div>`)[0]);
    }
    const pageSize = UI_DEFAULT_PAGE_SIZE;
    const totalPage = Number.parseInt((total / pageSize) + "") + (total % pageSize > 0 ? 1 : 0);
    let pageNum = 1;
    renderCompanyCommentContent({ pageNum, pageSize, button, menu, companyIdSha256 });
    let loading = false;
    menu.addEventListener("scroll", async () => {
      if (!loading) {
        loading = true;
        let scrollTop = menu.scrollTop;
        let menuHeight = menu.scrollHeight;
        if (scrollTop == menuHeight - menu.clientHeight) {
          if (pageNum < totalPage) {
            pageNum = pageNum + 1;
            await renderCompanyCommentContent({ pageNum, pageSize, button, menu, companyIdSha256 });
            loading = false;
          }
        } else {
          loading = false;
        }
      }
    })
  } catch (e) {
    //ERROR
    clearAllChildNode(badgeWrapper);
    button.title = "访问异常";
    badgeWrapper.appendChild($(`<div class="__comment_badge __comment_badge_error">❕</div>`)[0]);
    throw e
  }
}
const queryCompanyComment = async ({ pageNum, pageSize, companyIdSha256 } = {}) => {
  return await CompanyCommentApi.companyCommentSearch({
    pageNum,
    pageSize,
    companyId: companyIdSha256,
    emotion: -1,
    orderByColumn: "updateDatetime",
    orderBy: "DESC",
  });
}

const renderCompanyCommentContent = async ({ pageNum, pageSize, companyIdSha256, button, menu }) => {
  let summary = ``;
  button.title = summary;
  const queryResult = await queryCompanyComment({ pageNum, pageSize, companyIdSha256 });
  const pageItems = queryResult.items;
  if (pageItems.length > 0) {
    pageItems.forEach((item, index) => {
      const row = $(`<div class="__company_comment_row">
<div class="__company_comment_row_header"><span>${(pageNum - 1) * pageSize + index + 1}. </span><span>${item.companyName}</span> 评论来自:<span><${item.sourceDataName}></span> 更新时间:${convertTimeToHumanReadable(item.updateDatetime)}</div>
<div class="__company_comment_row_content">${item.comment}<div></div>`)[0];
      menu.appendChild(row);
    });
  } else {
    const noMore = $(`<div>没有更多评论</div>`)[0];
    menu.appendChild(noMore);
  }
}

export function genCommentTextButton(commentWrapperDiv, buttonLabel, dialogTitle, id, { autoLoad = false, platform, isRecommendPage, jobCardItemDom } = {}) {
  let targetDialogWrapper = jobCardItemDom;
  const buttonAnchorName = genUniqueId();
  const dialogDiv = document.createElement("div");
  dialogDiv.className = "__comment_dialog __modal __modal_bottom";
  dialogDiv.style = `position-anchor: --${buttonAnchorName};`;
  if (PLATFORM_BOSS == platform && isRecommendPage) {
    targetDialogWrapper = jobCardItemDom.parentElement;
  }
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
    targetDialogWrapper.removeChild(dialogDiv);
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

  const loadComment = () => {
    renderCommentContent({
      first: COMMENT_PAGE_SIZE, id, getDataCallback: async ({ first, after, last, before, id }) => {
        clearAllChildNode(commentBadgWrapper);
        //LOADING
        commentBadgWrapper.appendChild($(`<div class="__comment_badge __comment_badge_loading">⌛︎</div>`)[0]);
        commentButtonDiv.title = "加载中";
        try {
          const data = await queryComment({ first, after, last, before, id });
          clearAllChildNode(commentBadgWrapper);
          if (data?.search?.issueCount && data?.search?.issueCount > 0) {
            let summary = ``;
            for (let i = 0; i < data.search.nodes.length; i++) {
              const node = data.search.nodes[i];
              const { author, createdAt, bodyText } = node;
              summary += `${i + 1}: ${author.login}(${dateToStr(createdAt, "YYYY-MM-DD HH:mm:ss")}) >> ${bodyText}\n`
            }
            commentButtonDiv.title = summary;
            commentBadgWrapper.appendChild($(`<div class="__comment_badge __comment_badge_exists">${data.search.issueCount}</div>`)[0]);
          } else {
            commentButtonDiv.title = "";
            commentBadgWrapper.appendChild($(`<div class="__comment_badge __comment_badge_not_found">0</div>`)[0]);
          }
          return data;
        } catch (e) {
          //ERROR
          clearAllChildNode(commentBadgWrapper);
          commentButtonDiv.title = "访问异常";
          commentBadgWrapper.appendChild($(`<div class="__comment_badge __comment_badge_error">❕</div>`)[0]);
          throw e
        }
      }
    }, contentDiv);
  }
  const commentBadgWrapper = $(`<div class="__comment_badge_wrapper" style="anchor-name:--${buttonAnchorName};"></div>`)[0];
  commentButtonDiv.appendChild(commentBadgWrapper)
  commentButtonDiv.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    targetDialogWrapper.appendChild(dialogDiv);
    dialogDiv.classList.add("__dialog_normal");
    clearAllChildNode(contentDiv);
    dialogDiv.append(contentDiv);
    loadComment();
  });
  if (autoLoad) {
    loadComment()
  }
  return commentButtonDiv;
}

async function renderCommentContent({ first, after, last, before, id, getDataCallback } = {}, contentDiv) {
  const loadingLabel = $('<div>正加载评论⌛︎</div>')[0];
  const loadingDiv = $(`<div class="__comment_loading"></div>`)
    .append(loadingLabel)[0];
  contentDiv.appendChild(loadingDiv);
  //获取loginInfo，如获取成功
  let loginInfo = await AuthApi.authGetToken();
  if (!loginInfo) {
    //获取失败
    contentDiv.removeChild(loadingDiv);
    const login = $(`<div>点击登录到GitHub后可查看评论</div>`);
    const installLogin = $(`<div>(如需添加评论，请到后台管理[设置]页面安装GitHubApp)</div>`);
    const loginDiv = $(`<div class="__comment_loading"></div>`).append(login).append(installLogin)[0];
    contentDiv.appendChild(loginDiv);
    loginDiv.addEventListener("click", async () => {
      //执行登录流程
      clearAllChildNode(contentDiv);
      contentDiv.appendChild(loadingDiv);
      try {
        loadingLabel.textContent = "登录中⌛︎";
        loginInfo = await AuthApi.authOauth2Login();
        loadingLabel.textContent = "登录成功";
        renderCommentContent({ first, after, last, before, id, getDataCallback }, contentDiv);
      } catch (e) {
        errorLog(e);
        //TODO handle login failure
        loadingLabel.textContent = "登录失败，点击重新登录";
        loadingLabel.addEventListener("click", (event) => {
          renderCommentContent({ first, after, last, before, id, getDataCallback }, contentDiv);
        });
      }
    });
    return;
  }
  loadingLabel.textContent = "正加载评论⌛︎";
  let data = null;
  try {
    data = await getDataCallback({ first, after, last, before, id });
    clearAllChildNode(contentDiv);
    const items = data?.search?.nodes;
    const pageInfo = data?.search?.pageInfo;
    const total = data?.search?.issueCount;
    if (total == 0) {
      contentDiv.appendChild(createEmptyComment());
    } else {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const author = item.author;
        contentDiv.appendChild(createCommentRow(author.avatarUrl, author.login, item.createdAt, item.lastEditedAt, item.bodyText, item.bodyUrl));
      }
      contentDiv.appendChild(createCommonPageOperationMenu(pageInfo.hasPreviousPage, pageInfo.hasNextPage, pageInfo.startCursor, pageInfo.endCursor, total, async ({ first, after, last, before } = {}) => {
        renderCommentContent({ first, after, last, before, id, getDataCallback }, contentDiv)
      }));
    }
    const userDTO = await UserApi.userGet();
    contentDiv.appendChild(createAddCommentRow(contentDiv, loadingDiv, () => {
      renderCommentContent({ first: COMMENT_PAGE_SIZE, id, getDataCallback }, contentDiv)
    }, id, userDTO?.avatarUrl, userDTO?.login));
  } catch (e) {
    errorLog(e);
    loadingLabel.textContent = "加载评论失败，点击重新加载";
    loadingLabel.addEventListener("click", (event) => {
      renderCommentContent({ first, after, last, before, id, getDataCallback }, contentDiv);
    });
  }

}

async function queryComment({ first, after, last, before, id } = {}) {
  return await GithubApi.queryComment({ first, after, last, before, id });
}

function createEmptyComment() {
  const result = $(`<div class="__comment_empty_content">没有评论</div>`);
  return result[0];
}

function createCommentRow(avatarUrl, username, createdAt, lastEditedAt, content, bodyUrl) {
  const result = $(`
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
  const textareaId = genUniqueId();
  const submitComment = $(`<div class="__comment_submit_button_wrapper"><div class="__comment_submit_button">提交评论</div></div>`)[0];
  const submitFunction = async () => {
    loadingDiv.textContent = "评论提交中⌛︎";
    try {
      contentDiv.appendChild(loadingDiv);
      const content = $(`#${textareaId}`)[0].value;
      if (content && content.length > 10) {
        infoLog(`submit comment title(company id)=${id},body=${content}`)
        await GithubApi.addComment(id, content);
        loadingDiv.textContent = "评论内容成功，点击刷新列表";
        contentDiv.appendChild(loadingDiv);
        const removeLoadingFunction = () => {
          loadingDiv.removeEventListener("click", removeLoadingFunction);
          contentDiv.removeChild(loadingDiv);
          queryFunction();
        };
        loadingDiv.addEventListener("click", removeLoadingFunction);
      } else {
        loadingDiv.textContent = "评论内容长度过短，请重新编辑后提交";
        contentDiv.appendChild(loadingDiv);
        const removeLoadingFunction = () => {
          loadingDiv.removeEventListener("click", removeLoadingFunction);
          contentDiv.removeChild(loadingDiv);
        };
        loadingDiv.addEventListener("click", removeLoadingFunction);
      }
    } catch (e) {
      errorLog(e);
      loadingDiv.textContent = "评论提交失败，点击后，重新提交";
      contentDiv.appendChild(loadingDiv);
      const removeLoadingFunction = () => {
        loadingDiv.removeEventListener("click", removeLoadingFunction);
        contentDiv.removeChild(loadingDiv);
      };
      loadingDiv.addEventListener("click", removeLoadingFunction);
    }
  };
  submitComment.addEventListener("click", submitFunction);
  const result = $(`
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
  const result = $(`
    <div class="__comment_paging_wrapper">
      <div class="__comment_paging_total">共${total}条</div>
    </div>
    `);
  if (hasPreviousPage) {
    const element = $(`<div class="__company_info_quick_search_button __comment_paging_button">上一页</div>`)[0];
    element.addEventListener("click", async (event) => {
      queryFunction({ last: COMMENT_PAGE_SIZE, before: `${startCursor}` });
    })
    result.append(element);
  }
  if (hasNextPage) {
    const element = $(`<div class="__company_info_quick_search_button __comment_paging_button">下一页</div>`)[0];
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
  const loadingTagList = document.querySelectorAll(".__loading_tag");
  if (loadingTagList) {
    loadingTagList.forEach((item) => {
      item.classList.add("__status_job_render_error");
      item.textContent = text;
    });
  }
}

export function hiddenLoadingDOM() {
  const loadingTagList = document.querySelectorAll(".__loading_tag");
  if (loadingTagList) {
    loadingTagList.forEach((item) => {
      item.style = "visibility: hidden;";
    });
  }
}

export function renderTimeLoadingTag(divElement, brandName) {
  const timeText = "【正查找发布时间⌛︎】";
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
      const item = jobListItemList[i];
      item.classList.add("__51JOB_job_item");
    }
  }
  //for zhilian
  const paginationNode = node.querySelector(".pagination");
  if (paginationNode) {
    paginationNode.style = "order:99999;";
  }
}

export function renderSortJobItem(list, getListItem, { platform, orderStartIndex, isRecommendPage }) {
  if (orderStartIndex == undefined) {
    orderStartIndex = 0;
  }
  const idAndSortIndexMap = new Map();
  //设置一个标识id,renderSortCustomId
  list.forEach((item, index) => {
    item.renderSortCustomId = index;
  });
  const sortList = sortJobList(JSON.parse(JSON.stringify(list)), { platform });
  sortList.forEach((item, index) => {
    idAndSortIndexMap.set(item.renderSortCustomId, index);
  });
  list.forEach((item, index) => {
    const dom = getListItem(index);
    let targetDom;
    if (platform) {
      if (PLATFORM_JOBSDB == platform) {
        targetDom = dom.parentNode.parentNode;
      } else if (PLATFORM_BOSS == platform && isRecommendPage) {
        targetDom = dom.parentNode.parentNode;
      } else {
        targetDom = dom;
      }
    } else {
      targetDom = dom;
    }
    const styleString =
      "order:" + (idAndSortIndexMap.get(item.renderSortCustomId) + orderStartIndex) + ";";
    targetDom.style = styleString;
  });
}

export function sortJobList(list, { platform }) {
  const sortList = list;
  //sort firstBrowseDatetime
  sortList.sort((o1, o2) => {
    return (
      dayjs(o2.firstBrowseDatetime ?? null).valueOf() -
      dayjs(o1.firstBrowseDatetime ?? null).valueOf()
    );
  });
  //handle hr active time
  if (platform == PLATFORM_BOSS || platform == PLATFORM_LIEPIN) {
    //先排列hrActiveTime,再排列createDatetime，
    sortList.sort((o1, o2) => {
      return convertHrActiveTimeDescToOffsetTime(
        o1.hrActiveTimeDesc
      ) - convertHrActiveTimeDescToOffsetTime(
        o2.hrActiveTimeDesc
      );
    });
    sortList.sort((o1, o2) => {
      return (
        dayjs(o2.createDatetime).valueOf() -
        dayjs(o1.createDatetime).valueOf()
      );
    });
  }
  if (platform != PLATFORM_BOSS) {
    //sort createDatetime and firstPublishTime
    const getMinDatetime = (jobDTO) => {
      return dayjs.min(dayjs(jobDTO.jobFirstPublishDatetime), dayjs(jobDTO.createDatetime));
    }
    sortList.sort((o1, o2) => {
      return (
        dayjs(getMinDatetime(o2)).valueOf() -
        dayjs(getMinDatetime(o1)).valueOf()
      );
    });
  }
  return sortList;
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
      const groups = hrActiveTimeDesc.match(ACTIVE_TIME_MATCH).groups;
      if (groups) {
        const num = groups.num;
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

export async function renderFunctionPanel(
  list,
  getListItem,
  { platform, getCompanyInfoFunction, searchButtonTitle, isRecommendPage } = {}
) {
  stopAndCleanAbortFunctionHandler();
  const jobTagDTOArray = await JobApi.jobTagGetAllDTOByJobIds(list.map(item => item.jobId));
  const jobIdAndDTOMap = new Map();
  jobTagDTOArray.forEach(item => {
    const jobId = item.jobId;
    if (!jobIdAndDTOMap.has(jobId)) {
      jobIdAndDTOMap.set(jobId, []);
    }
    jobIdAndDTOMap.get(jobId).push(item);
  });
  list.forEach((item, index) => {
    const dom = getListItem(index, item);
    const targetDom = dom;
    const functionPanelDiv = document.createElement("div");
    functionPanelDiv.classList.add(`__${platform}_function_panel`);
    //delete before insert element
    targetDom.querySelectorAll(`.__${platform}_function_panel`).forEach(item => item.parentElement.removeChild(item));
    targetDom.append(functionPanelDiv);
    functionPanelDiv.onclick = (event) => {
      event.stopPropagation();
    };
    functionPanelDiv.appendChild(createLogo());
    functionPanelDiv.appendChild(
      createCompanyInfo(item, {
        getCompanyInfoFunction: getCompanyInfoFunction,
        platform,
        searchButtonTitle,
        jobCardItemDom: targetDom,
        isRecommendPage
      })
    );
    functionPanelDiv.appendChild(createOtherJobTag(item, jobIdAndDTOMap));
    functionPanelDiv.appendChild(createMyJobTag(item, jobIdAndDTOMap));
    functionPanelDiv.appendChild(createCommentWrapper(item));
  });
}

function createOtherJobTag(item, jobIdAndDTOMap) {
  const wrapper = document.createElement("div");
  wrapper.className = "__job_tag_wrapper";
  const labelDiv = document.createElement("div");
  labelDiv.className = "__job_tag_label";
  labelDiv.textContent = "职位标签：";
  wrapper.appendChild(labelDiv);
  const jobTagDiv = document.createElement("div");
  jobTagDiv.className = "__job_tag_all";
  wrapper.appendChild(jobTagDiv);
  asyncRenderOtherJobTag(jobTagDiv, item, jobIdAndDTOMap);
  return wrapper;
}

async function asyncRenderOtherJobTag(div, item, jobIdAndDTOMap) {
  const jobTagDTOList = (jobIdAndDTOMap.get(item.jobId) ?? []).filter(item => item.sourceType == TAG_SOURCE_TYPE_CUSTOM && item.source != null);
  if (jobTagDTOList.length > 0) {
    convertToTagData(jobTagDTOList).forEach(item => {
      div.appendChild(createTag(item))
    });
  } else {
    div.parentElement.style = "display:none;";
  }
}

function createTag(item) {
  return $(`<div style="display:flex;align-items: center;background-color:${getRandomColor()};border-radius: 3px;padding: 3px;margin-right: 5px;" 
    title=${item.sourceList.filter(item => item.source != null).map(item => item.source).join(",")}
    >
    ${item.isPublic ? '<iconify-icon icon="material-symbols:public"></iconify-icon>' : '<iconify-icon icon="material-symbols:private-connectivity"></iconify-icon>'}(${item.sourceList.length}${item.self ? "*" : ""})${item.tagName}
    </div>`)[0];
}

function createMyJobTag(item, jobIdAndDTOMap) {
  const wrapper = document.createElement("div");
  wrapper.className = "__job_tag_wrapper";
  const labelDiv = document.createElement("div");
  labelDiv.className = "__job_tag_label";
  labelDiv.textContent = "职位标签(我)：";
  wrapper.appendChild(labelDiv);
  const jobTagDiv = document.createElement("div");
  jobTagDiv.className = "__job_tag";
  wrapper.appendChild(jobTagDiv);
  asyncRenderTag(jobTagDiv, "职位", async () => {
    return (jobIdAndDTOMap.get(item.jobId) ?? []).filter(item => item.sourceType == TAG_SOURCE_TYPE_CUSTOM && item.source == null)
  }, async (tags) => {
    const param = new JobTagBO();
    param.jobId = item.jobId;
    param.tags = tags;
    return JobApi.jobTagAddOrUpdate(param);
  }, async () => {
    return await JobApi.jobTagGetRecentlyTag({})
  });
  return wrapper;
}

export function createLogo() {
  const logo = document.createElement("div");
  logo.innerHTML = logoResource;
  logo.classList.add("__logo_in_function_panel");
  return logo;
}

function createCommentWrapper(jobDTO) {
  const jobId = jobDTO.jobId;
  const commentWrapperDiv = document.createElement("div");
  commentWrapperDiv.id = "wrapper" + jobId;
  const browseDetailCount = jobDTO.browseDetailCount ?? 0;
  const browseCount = jobDTO.browseCount ?? 0;
  // const total = browseDetailCount + browseCount;
  const browseChart = $(`<div labels='["A","B"]' class="__browse_chart_wrapper has-shape-colors"><tc-bar horizontal class="__browse_chart" values="[${browseDetailCount},${browseCount}]" max="${20}"></tc-bar></div>`)[0];
  browseChart.title = `职位查看次数: ${browseDetailCount}\n职位展示次数: ${browseCount}`;
  commentWrapperDiv.appendChild(browseChart);
  return commentWrapperDiv;
}

function createCompanyInfo(item, { getCompanyInfoFunction, platform, searchButtonTitle, jobCardItemDom, isRecommendPage } = {}) {
  const dom = document.createElement("div");
  dom.className = "__company_info_quick_search";
  const mainChannelDiv = document.createElement("div");
  const otherChannelDiv = document.createElement("div");
  const quickSearchButton = document.createElement("div");
  quickSearchButton.className = "__company_info_quick_search_button";
  if (searchButtonTitle) {
    quickSearchButton.textContent = `🔎${searchButtonTitle}`;
  } else {
    quickSearchButton.textContent = "🔎点击快速查询公司信息";
  }
  const fixValidHummanButton = document.createElement("a");
  fixValidHummanButton.className = "__company_info_quick_search_button";
  fixValidHummanButton.target = "_blank";
  fixValidHummanButton.ref = "noopener noreferrer";
  const quickSearchButtonLoading = document.createElement("div");
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
      if (!item.isFullCompanyName && getCompanyInfoFunction) {
        let targetCompanyName = await getCompanyInfoFunction(
          item.jobCompanyApiUrl,
          { item }
        );
        jobCardItemDom.title = item.jobDescription;
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
        const reputationWrapperDiv = document.createElement("div");
        const companyTagWrapperDiv = document.createElement("div");
        otherChannelDiv.appendChild(reputationWrapperDiv);
        otherChannelDiv.appendChild(companyTagWrapperDiv);
        companyTagWrapperDiv.append(createCompanyTag(companyName))
        reputationWrapperDiv.append(createCompanyReputation(companyName, () => {
          clearAllChildNode(companyTagWrapperDiv);
          companyTagWrapperDiv.append(createCompanyTag(companyName));
        }));

        const companyIdSha256 = genIdFromText(companyName);
        const commentWrapperDiv = document.createElement("div");
        commentWrapperDiv.className = `__comment_wrapper __${platform}_comment_wrapper`
        commentWrapperDiv.appendChild(createSearchCompanyLink(companyName));
        commentWrapperDiv.appendChild(createCompanyCommentButton(companyName, companyIdSha256));
        const companyCommentButton = genCommentTextButton(
          commentWrapperDiv,
          "在线公司评论",
          companyName,
          companyIdSha256,
          { autoLoad: true, isRecommendPage, platform, jobCardItemDom }
        );
        // 换行
        commentWrapperDiv.appendChild(companyCommentButton);
        commentWrapperDiv.appendChild($(`<div style="width:100%;"></div>`)[0]);
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
  if (item.isFullCompanyName) {
    (async () => {
      //查询数据库是否有公司信息
      const company = await CompanyApi.getCompanyById(
        genSha256(item.jobCompanyName) + ""
      );
      if (company) {
        //自动查询公司信息
        quickSearchHandle(false);
      }
    })();
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
    const convertedCompanyName = companyNameConvert(keyword);
    //查询数据库是否有公司信息
    let company = await CompanyApi.getCompanyById(
      genSha256(convertedCompanyName) + ""
    );
    const now = dayjs();
    if (
      !forceSyncData &&
      company &&
      now.isBefore(dayjs(company.updateDatetime).add(COMPANY_DATA_EXPRIE_DAY, "day"))
    ) {
      //skip
    } else {
      //数据库没有数据或数据过期了，则进行网络查询，保存数据到数据库
      const companyInfo = await getCompanyInfoByAiqicha(keyword);
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
  const contentDiv = $("<div></div>");
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
      .append(
        $(
          `<div title='${company.regCapitalValue ? Number.prototype.toLocaleString.call(Number(company.regCapitalValue)) : "-"}'><div class="__company_info_quick_search_item_label" >注册资本：</div>${convertNumberToHumanReadable(company.regCapitalValue)}${company.regCapitalCurrency ? (company.regCapitalCurrency) : ""}</div>`
        )
      )
  );
  const websiteStatusElement = $(`<div></div>`);
  renderWebsiteStatus(websiteStatusElement[0], company.companyWebSite);
  const websiteWhoisElement = $(`<div></div>`);
  renderWebsiteWhois(websiteWhoisElement[0], company.companyWebSite);
  const websiteIpcElement = $(`<div></div>`);
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
  const syncDataButton = document.createElement("div");
  syncDataButton.className = "__company_info_quick_search_button";
  syncDataButton.textContent = `📥${convertTimeOffsetToHumanReadable(
    company.updateDatetime
  )}`;
  syncDataButton.title = "点击立即同步数据";
  syncDataButton.onclick = () => {
    contentDiv[0].parentElement.removeChild(contentDiv[0]);
    quickSearchHandle(true);
  };
  contentDiv.append(
    $(`<div class="__company_info_quick_search_item"></div>`)
      .append(
        $(
          `<div class="__company_info_quick_search_item_source"><div class="__company_info_quick_search_item_label">数据来源：</div><div class="__company_info_quick_search_item_value"><a href="${company.sourceUrl}" target = "_blank"; ref = "noopener noreferrer">${company.sourceUrl}</a></div></div>`
        )
      ).append(syncDataButton)
  );
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
      const url = `https://icp.aizhan.com/${encodeURIComponent(
        getDomain(autoFillHttp(website))
      )}/`;
      const result = await httpFetchGetText(url, (abortFunction) => {
        abortFunctionHandler = abortFunction;
        //加入请求手动中断列表
        addAbortFunctionHandler(abortFunctionHandler);
      });
      //请求正常结束，从手动中断列表中移除
      deleteAbortFunctionHandler(abortFunctionHandler);
      const firstMatchArray = result.match(
        /<table class="table">[\s\S]*<tr><td class="thead">主办单位名称<\/td><td>.*[<\td>]?/
      );
      if (firstMatchArray && firstMatchArray.length > 0) {
        const groups = firstMatchArray[0]
          ?.replaceAll("\n", "")
          ?.replaceAll("\t", "")
          ?.replaceAll(" ", "")
          ?.replaceAll("&nbsp;", "")
          ?.match(
            /<tr>(?<name>.*?)<\/tr><tr>(?<type>.*?)<\/tr><tr>(?<ipc>.*?)<\/tr>/
          )?.groups;
        if (groups) {
          const name = groups.name.match(/<td>(?<name>.*)<a/).groups.name;
          const type = groups.type.match(/<td>(?<type>.*)<\/td>/).groups.type;
          const ipc = groups.ipc.match(/<span>(?<ipc>.*)<\/span>/).groups.ipc;
          element.textContent = "";
          element.className = "";
          element.className = "__company_info_quick_search_sub_item";
          element.title = `${name}(性质：${type})`;
          const rootElement = $(element);
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
      const syncDataButton = document.createElement("div");
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
      const url = `https://whois.chinaz.com/${encodeURIComponent(website)}`;
      const result = await httpFetchGetText(url, (abortFunction) => {
        abortFunctionHandler = abortFunction;
        //加入请求手动中断列表
        addAbortFunctionHandler(abortFunctionHandler);
      });
      //请求正常结束，从手动中断列表中移除
      deleteAbortFunctionHandler(abortFunctionHandler);
      const groups = result.match(
        /注册时间[\s\S]*<\/div>[\s\S]*<div item-value>(?<registDate>.*)<\/div>[\s\S]*/
      )?.groups;
      if (groups && groups.registDate) {
        const date = dayjs(
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
      const url = `${autoFillHttp(website)}`;
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
  dom.className = "__company_info_quick_search_wrapper";
  const quickSearch = $(`<div></div>`)[0];
  quickSearch.className =
    "__company_info_quick_search_item __company_info_other_channel";
  const buttonAnchorName = genUniqueId();
  const button = $(`<div class="__comment_button" style="anchor-name:--${buttonAnchorName};">其他查询渠道</div>`)[0];
  const menu = $(`<div
    style="display:none;position-anchor: --${buttonAnchorName};" class="__modal"
      ></div>`)[0];
  const toggleMenu = () => {
    if (menu.style.display == "none") {
      menu.style.display = "block";
    } else {
      menu.style.display = "none";
    }
  };
  menu.addEventListener('click', toggleMenu);
  button.addEventListener('click', toggleMenu);
  quickSearch.appendChild(button);

  menu.appendChild($(`<div>互联网渠道：</div>`)[0]);
  menu.appendChild(
    createATagWithSearch(`https://aiqicha.baidu.com/s?q=${decode}`, "爱企查")
  );
  menu.appendChild(
    createATagWithSearch(
      `https://www.xiaohongshu.com/search_result?keyword=${decode}`,
      "小红书"
    )
  );
  menu.appendChild(
    createATagWithSearch(
      `https://maimai.cn/web/search_center?type=feed&query=${decode}&highlight=true`,
      "脉脉"
    )
  );
  menu.appendChild(
    createATagWithSearch(`https://www.bing.com/search?q=${decode}`, "必应")
  );
  menu.appendChild(
    createATagWithSearch(`https://www.google.com/search?q=${decode}`, "Google")
  );

  menu.appendChild($(`<div>政府渠道：</div>`)[0]);
  menu.appendChild(
    createATagWithSearch(
      `https://beian.miit.gov.cn/#/Integrated/recordQuery`,
      "工信部"
    )
  );
  menu.appendChild(
    createATagWithSearch(
      `https://www.creditchina.gov.cn/xinyongxinxixiangqing/xyDetail.html?keyword=${decode}`,
      "信用中国"
    )
  );
  menu.appendChild(
    createATagWithSearch(
      `https://www.gsxt.gov.cn/corp-query-homepage.html`,
      "企业信用"
    )
  );
  menu.appendChild(
    createATagWithSearch(`http://zxgk.court.gov.cn/zhzxgk/`, "执行信息")
  );
  menu.appendChild(
    createATagWithSearch(`https://wenshu.court.gov.cn/`, "裁判文书")
  );
  menu.appendChild(
    createATagWithSearch(`https://xwqy.gsxt.gov.cn/`, "个体私营")
  );

  quickSearch.appendChild(menu);
  dom.appendChild(quickSearch);
  return dom;
}

export function createCompanyTag(companyName) {
  const dom = document.createElement("div");
  dom.appendChild(createOtherCompanyTag(companyName));
  dom.appendChild(createMyCompanyTag(companyName));
  return dom;
}

function createOtherCompanyTag(companyName) {
  const companyId = genIdFromText(companyName);
  const root = document.createElement("div");
  root.className = "__company_info_quick_search_item";
  const labelDiv = document.createElement("div");
  labelDiv.className = "__company_info_quick_search_item_label";
  labelDiv.textContent = "公司标签：";
  root.appendChild(labelDiv);
  const tagDiv = document.createElement("div");
  tagDiv.className = "__company_tag";
  root.appendChild(tagDiv);
  asyncRenderCompanyJobTag(tagDiv, companyId);
  return root;
}

async function asyncRenderCompanyJobTag(div, companyId) {
  const companyTagDTOList = (await CompanyApi.getAllCompanyTagDTOByCompanyId(companyId)).filter(item => !(item.sourceType == TAG_SOURCE_TYPE_CUSTOM && item.source == null));
  if (companyTagDTOList.length > 0) {
    convertToTagData(companyTagDTOList).forEach(item => {
      div.appendChild(createTag(item))
    });
  } else {
    div.parentElement.style = "display:none;";
  }
}

function createMyCompanyTag(companyName) {
  const root = document.createElement("div");
  root.className = "__company_info_quick_search_item";
  const labelDiv = document.createElement("div");
  labelDiv.className = "__company_info_quick_search_item_label";
  labelDiv.textContent = "公司标签(我)：";
  const tagDiv = document.createElement("div");
  tagDiv.className = "__company_tag";
  root.appendChild(labelDiv);
  root.appendChild(tagDiv);
  asyncRenderTag(tagDiv, "公司", async () => {
    const companyId = genIdFromText(companyName);
    return (await CompanyApi.getAllCompanyTagDTOByCompanyId(companyId)).filter(item => item.sourceType == TAG_SOURCE_TYPE_CUSTOM && item.source == null);
  }, async (tags) => {
    const param = new CompanyTagBO();
    param.companyName = companyName;
    param.tags = tags;
    return CompanyApi.addOrUpdateCompanyTag(param)
  }, async () => {
    return await CompanyApi.companyTagGetRecentlyTag({})
  });
  return root;
}

async function asyncRenderTag(div, title, getAllDTOFunction, saveTagFunction, getRecentlyTagFunction) {
  let inputReadOnly = true;
  const input = document.createElement("input");
  div.appendChild(input);
  const tagify = new Tagify(input, {
    transformTag: transformTag,
    dropdown: {
      maxItems: 20,           // <- mixumum allowed rendered suggestions
      classname: 'tags-look', // <- custom classname for this dropdown, so it could be targeted
      enabled: 0,             // <- show suggestions on focus
      closeOnSelect: false    // <- do not hide the suggestions dropdown once an item has been selected
    }
  });
  //get tag
  const tagArray = await getAllDTOFunction();
  tagArray.forEach(item => {
    tagify.addTags(item.tagName);
  });
  const dragsort = new DragSort(tagify.DOM.scope, {
    selector: '.' + tagify.settings.classNames.tag,
    callbacks: {
      dragEnd: (elem) => {
        tagify.updateValueByDOMTags();
      }
    }
  });
  tagify.setReadonly(true);
  //add tag to tagify
  const operationButton = document.createElement("div");
  operationButton.className = "__tag_operation_button";
  operationButton.textContent = "📝编辑"
  div.append(operationButton);
  let saving = false;
  operationButton.addEventListener("click", async () => {
    if (saving) return;
    inputReadOnly = !inputReadOnly;
    if (inputReadOnly) {
      //禁用 operationButton 的点击事件
      saving = true;
      operationButton.textContent = `${title}标签保存中⌛︎`;
      tagify.setReadonly(true);
      //save tag
      const value = tagify.getInputValue();
      let result = [];
      if (value) {
        result = JSON.parse(tagify.getInputValue());
      }
      const tags = [];
      result.forEach((item) => {
        tags.push(item.value);
      })
      await saveTagFunction(tags);
      operationButton.textContent = "📝编辑";
      tagify.setReadonly(true);
      saving = false;
    } else {
      const allTags = await getRecentlyTagFunction();
      const tagItems = [];
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

  const h = rand(1, 360) | 0,
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
  const labelDiv = document.createElement("div");
  labelDiv.className = "__company_info_quick_search_item_label";
  labelDiv.textContent = "公司风评检测：";
  dom.appendChild(labelDiv);
  const contentDiv = document.createElement("div");
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
        const totalNum = (result?.data?.page?.totalNum) ?? 0;
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
      const hyperlinks = $(result).find(".ap-questions-hyperlink");
      return hyperlinks ? hyperlinks.length : 0;
    },
  }));
  contentDiv.appendChild(genCompanyCheckingElement(keyword, companyTagUpdateCallback, {
    title: "互联网企业黑名单",
    sourceTitle: "信息来源:互联网企业黑名单 https://www.job996.xyz/",
    sourceUrl: `https://www.job996.xyz/index.php/search/${encodeURIComponent(keyword)}`,
    companyTag: TAG_IT_BLACK_LIST,
    searchFunction: async (keyword) => {
      return await httpFetchGetTextWithAbort(`https://www.job996.xyz/index.php/search/${encodeURIComponent(keyword)}`);
    },
    handleSearchCount: (result) => {
      const hyperlinks = $(result).find("div[class=\"post-box paddingall\"]");
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
      const hyperlinks = $(result).find("div[class=\"media\"]")
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
    platform: companyTag,
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
  platform,
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
        platform,
      });
    }
  );
  div.appendChild(loaddingTag);
  renderCompanyReputationColor(loaddingTag, "black");
  try {
    const result = await searchFunction(keyword)
    const count = handleSearchCount(result);
    clearAllChildNode(div);
    if (count > 0) {
      //存在于黑名单
      const tag = createATag("📡", sourceUrl, `${title}(疑似${count}条记录)`);
      div.appendChild(tag);
      renderCompanyReputationColor(tag, "red");
      await addCompanyTagNotExists(keyword, [companyTag], platform);
      companyTagUpdateCallback();
    } else {
      //不存在
      const tag = createATag("📡", sourceUrl, `${title}(无记录)`);
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
          platform,
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
  const aTag = document.createElement("a");
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
