import dayjs from "dayjs";
import { isOutsource } from "../common/data/outsource";
import { isTraining } from "../common/data/training";
import {
  convertTimeToHumanReadable,
  convertTimeOffsetToHumanReadable,
} from "../common/utils";
import {
  JOB_STATUS_DESC_NEWEST,
  PLATFORM_BOSS,
  PLATFORM_JOBSDB,
} from "./common";
import {
  genJobItemIdWithSha256,
  genCompanyIdWithSha256,
} from "./commonDataHandler";
import { httpFetchGetText } from "../common/api/common";

import { logoBase64 } from "./assets/logo";
import $ from "jquery";

const ACTIVE_TIME_MATCH = /(?<num>[0-9\.]*)/;

export function renderTimeTag(
  divElement,
  jobDTO,
  { jobStatusDesc, hrActiveTimeDesc, platform } = {}
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
        statusTag.innerHTML = "【 " + statusToTimeText + "发布❔】";
        statusTag.title =
          "当前招聘状态【" +
          jobStatusDesc.label +
          "】，招聘状态：最新：代表一周内发布；招聘中：代表发布时间超过一周";
      } else {
        statusTag.innerHTML = "【发布时间未知】";
      }
      statusTag.classList.add("__time_tag_base_text_font");
      divElement.appendChild(statusTag);
    }
    //hrActiveTimeDesc for boss
    if (hrActiveTimeDesc) {
      let hrActiveTimeDescTag = document.createElement("span");
      hrActiveTimeDescTag.innerHTML = "【HR-" + hrActiveTimeDesc + "】";
      hrActiveTimeDescTag.classList.add("__time_tag_base_text_font");
      divElement.appendChild(hrActiveTimeDescTag);
    }
  } else {
    //firstPublishTime
    let firstPublishTime = jobDTO.jobFirstPublishDatetime;
    if (firstPublishTime) {
      let firstPublishTimeTag = document.createElement("span");
      let firstPublishTimeHumanReadable = convertTimeToHumanReadable(
        firstPublishTime
      );
      firstPublishTimeTag.innerHTML +=
        "【" + firstPublishTimeHumanReadable + "发布】";
      firstPublishTimeTag.classList.add("__time_tag_base_text_font");
      divElement.appendChild(firstPublishTimeTag);
    }
  }
  //companyInfo
  let companyInfoTag = null;
  let companyInfoText = getCompanyInfoText(jobDTO.jobCompanyName);
  if (companyInfoText !== "") {
    companyInfoTag = document.createElement("span");
    companyInfoTag.innerHTML = companyInfoText;
    companyInfoTag.classList.add("__time_tag_base_text_font");
    divElement.appendChild(companyInfoTag);
  }

  divElement.classList.add("__time_tag_base_text_font");

  //为time tag染色
  if (hrActiveTimeDesc) {
    // for boss
    //根据hr活跃时间为JobItem染色
    let now = dayjs();
    let hrActiveDatetime = now.subtract(
      convertHrActiveTimeDescToOffsetTime(hrActiveTimeDesc),
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
    let jobItemIdSha256 = genJobItemIdWithSha256(jobId);
    let companyIdSha256 = genCompanyIdWithSha256(item.jobCompanyName);
    let commentWrapperDiv = document.getElementById("wrapper" + jobId);
    commentWrapperDiv.classList.add("__comment_wrapper");
    commentWrapperDiv.classList.add("__" + platform + "_comment_wrapper");
    let companyCommentButton = genCommentTextButton(
      commentWrapperDiv,
      "查看公司评论💬",
      item.jobCompanyName,
      companyIdSha256
    );
    commentWrapperDiv.append(companyCommentButton);
    let jobItemCommentButton = genCommentTextButton(
      commentWrapperDiv,
      "查看职位评论💬",
      item.jobName + "-" + item.jobCompanyName,
      jobItemIdSha256
    );
    commentWrapperDiv.append(jobItemCommentButton);
  }
}

function genCommentTextButton(commentWrapperDiv, buttonLabel, dialogTitle, id) {
  const dialogDiv = document.createElement("div");
  dialogDiv.style =
    "position: absolute;background-color: white;z-index: 9999;color: black;padding: 6px;border-radius: 10px;box-shadow: 0 2px 10px rgba(0, 0, 0, .08);";

  const menuDiv = document.createElement("div");
  menuDiv.style = "display: flex;justify-content: end;}";

  const maximizeDiv = document.createElement("div");
  maximizeDiv.style = "font-size: 20px;padding: 5px;";
  maximizeDiv.innerHTML = "⬜";
  menuDiv.appendChild(maximizeDiv);

  const closeDiv = document.createElement("div");
  closeDiv.style = "font-size: 20px;padding: 5px;";
  closeDiv.innerHTML = "✖️";
  closeDiv.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    commentWrapperDiv.removeChild(dialogDiv);
  });
  menuDiv.appendChild(closeDiv);

  dialogDiv.append(menuDiv);
  const titleDiv = document.createElement("div");
  titleDiv.style = "font-size: 15px;text-align: left;padding: 5px;";
  titleDiv.innerHTML = dialogTitle;
  dialogDiv.appendChild(titleDiv);

  const commentIframe = document.createElement("iframe");
  commentIframe.src =
    "https://widget.0xecho.com/?color-theme=light&desc=&has-h-padding=true&has-v-padding=true&modules=comment%2Clike%2Cdislike&receiver=&target_uri=" +
    id +
    "&height=800&display=iframe";
  commentIframe.width = 400;
  commentIframe.height = 400;
  commentIframe.style = "border: none;";
  dialogDiv.appendChild(commentIframe);

  let maximize = false;
  const maximizeFunction = (event) => {
    event.preventDefault();
    event.stopPropagation();
    maximize = !maximize;
    if (maximize) {
      commentIframe.width = 800;
      commentIframe.height = 800;
    } else {
      commentIframe.width = 400;
      commentIframe.height = 400;
    }
  };
  maximizeDiv.addEventListener("click", maximizeFunction);
  menuDiv.addEventListener("dblclick", maximizeFunction);

  const copmmentButtonDiv = document.createElement("div");
  copmmentButtonDiv.innerHTML = buttonLabel;
  copmmentButtonDiv.style =
    "cursor: pointer;margin-left: 5px;text-decoration: underline; color:blue;";
  copmmentButtonDiv.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    commentWrapperDiv.appendChild(dialogDiv);
  });

  return copmmentButtonDiv;
}

export function createLoadingDOM(brandName, styleClass) {
  const div = document.createElement("div");
  div.classList.add(styleClass);
  div.classList.add("__loading_tag");
  renderTimeLoadingTag(div, brandName);
  return div;
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
  divElement.innerHTML = text;
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
  //for zhilian
  const paginationNode = node.querySelector(".pagination");
  if (paginationNode) {
    paginationNode.style = "order:99999;";
  }
}

export function renderSortJobItem(list, getListItem, { platform }) {
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
  if (platform == PLATFORM_BOSS) {
    //handle hr active time
    sortList.forEach((item) => {
      let hrActiveTimeOffsetTime = convertHrActiveTimeDescToOffsetTime(
        item.hrActiveTimeDesc
      );
      item.hrActiveTimeOffsetTime = hrActiveTimeOffsetTime;
    });
    sortList.sort((o1, o2) => {
      return o1.hrActiveTimeOffsetTime - o2.hrActiveTimeOffsetTime;
    });
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
      "order:" + idAndSortIndexMap.get(item.renderSortCustomId) + ";";
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
    if (hrActiveTimeDesc.includes("刚刚")) {
      offsetTime = 0;
    } else if (
      hrActiveTimeDesc.includes("日") ||
      hrActiveTimeDesc.includes("周") ||
      hrActiveTimeDesc.includes("月")
    ) {
      if (hrActiveTimeDesc.includes("日")) {
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

//请求中断列表
let abortFunctionHandlerMap = new Map();

export function renderFunctionPanel(list, getListItem, { platform } = {}) {
  if (abortFunctionHandlerMap && abortFunctionHandlerMap.size > 0) {
    //中断上一次的查询请求
    abortFunctionHandlerMap.forEach((value, key, map) => {
      key();
    });
  }
  abortFunctionHandlerMap.clear();
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
    functionPanelDiv.appendChild(createLogo());
    functionPanelDiv.appendChild(createSearchCompanyLink(item.jobCompanyName));
    functionPanelDiv.appendChild(createCompanyReputation(item.jobCompanyName));
    functionPanelDiv.appendChild(createCommentWrapper(item));
  });
}

function createLogo() {
  let logo = document.createElement("img");
  logo.src = "data:image/png;base64," + logoBase64;
  logo.classList.add("__logo_in_function_panel");
  return logo;
}

function createCommentWrapper(jobDTO) {
  let jobId = jobDTO.jobId;
  let commentWrapperDiv = document.createElement("div");
  commentWrapperDiv.id = "wrapper" + jobId;
  commentWrapperDiv.appendChild(createFirstBrowse(jobDTO));
  return commentWrapperDiv;
}

function createFirstBrowse(jobDTO) {
  let firstBrowseTimeTag = document.createElement("div");
  let firstBrowseTimeHumanReadable = convertTimeOffsetToHumanReadable(
    jobDTO.createDatetime
  );
  firstBrowseTimeTag.innerHTML +=
    "【" +
    firstBrowseTimeHumanReadable +
    "展示过(共" +
    jobDTO.browseCount +
    "次)】";
  firstBrowseTimeTag.classList.add("__first_browse_time");
  return firstBrowseTimeTag;
}

function createSearchCompanyLink(keyword) {
  const decode = encodeURIComponent(keyword);
  const dom = document.createElement("div");
  dom.className = "__company_info_search";
  let labelDiv = document.createElement("div");
  labelDiv.innerHTML = "公司信息查询：";
  dom.appendChild(labelDiv);
  dom.appendChild(
    createATagWithSearch(
      `https://www.xiaohongshu.com/search_result?keyword=${decode}`,
      "小红书"
    )
  );
  dom.appendChild(
    createATagWithSearch(
      `https://maimai.cn/web/search_center?type=feed&query=${decode}&highlight=true`,
      "脉脉"
    )
  );
  dom.appendChild(
    createATagWithSearch(`https://www.bing.com/search?q=${decode}`, "必应")
  );
  dom.appendChild(
    createATagWithSearch(`https://www.google.com/search?q=${decode}`, "Google")
  );
  dom.appendChild(
    createATagWithSearch(`https://aiqicha.baidu.com/s?q=${decode}`, "爱企查")
  );
  return dom;
}

function createCompanyReputation(keyword) {
  const dom = document.createElement("div");
  dom.className = "__company_info_search";
  let labelDiv = document.createElement("div");
  labelDiv.innerHTML = "公司风评检测：";
  dom.appendChild(labelDiv);
  const ruobilinDiv = document.createElement("div");
  dom.appendChild(ruobilinDiv);
  asyncRenderRuobilin(ruobilinDiv, keyword);
  return dom;
}

async function asyncRenderRuobilin(div, keyword) {
  div.title = "信息来源:跨境小白网（若比邻网）https://kjxb.org/";
  const decode = encodeURIComponent(keyword);
  const url = `https://kjxb.org/?s=${decode}&post_type=question`;
  const loaddingTag = createATag(
    "📡",
    url,
    "若比邻黑名单(检测中⌛︎)",
    (event) => {
      clearAllChildNode(div);
      asyncRenderRuobilin(div, keyword);
    }
  );
  div.appendChild(loaddingTag);
  renderRuobilinColor(loaddingTag, "black");
  try {
    let abortFunctionHandler = null;
    const result = await httpFetchGetText(url, (abortFunction) => {
      abortFunctionHandler = abortFunction;
      //加入请求手动中断列表
      abortFunctionHandlerMap.set(abortFunctionHandler, null);
    });
    //请求正常结束，从手动中断列表中移除
    abortFunctionHandlerMap.delete(abortFunctionHandler);
    let hyperlinks = $(result).find(".ap-questions-hyperlink");
    clearAllChildNode(div);
    if (hyperlinks && hyperlinks.length > 0) {
      //存在于若比邻黑名单
      const count = hyperlinks.length;
      let tag = createATag("📡", url, `若比邻黑名单(疑似${count}条记录)`);
      div.appendChild(tag);
      renderRuobilinColor(tag, "red");
    } else {
      //不存在
      let tag = createATag("📡", url, "若比邻黑名单(无记录)");
      div.appendChild(tag);
      renderRuobilinColor(tag, "yellowgreen");
    }
  } catch (e) {
    clearAllChildNode(div);
    const errorDiv = createATag(
      "📡",
      url,
      "若比邻黑名单(检测失败，点击重新检测)",
      (event) => {
        clearAllChildNode(div);
        asyncRenderRuobilin(div, keyword);
      }
    );
    errorDiv.href = "javaScript:void(0);";
    errorDiv.target = "";
    div.appendChild(errorDiv);
    renderRuobilinColor(errorDiv, "black");
  }
}

function clearAllChildNode(div) {
  div.innerHTML = "";
}

function renderRuobilinColor(div, color) {
  div.style = `background-color:${color};color:white`;
}

function clearRuobilinColor(div) {
  div.style = null;
}

function createATagWithSearch(url, label) {
  return createATag("🔎", url, label);
}

function createATag(emoji, url, label, callback) {
  let aTag = document.createElement("a");
  aTag.href = url;
  aTag.target = "_blank";
  aTag.ref = "noopener noreferrer";
  aTag.text = emoji + label;
  aTag.addEventListener("click", (event) => {
    if (callback) {
      callback(event);
    }
    event.stopPropagation();
  });
  return aTag;
}
