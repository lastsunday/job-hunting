import dayjs from "dayjs";
import { isOutsource } from "../common/data/outsource";
import { isTraining } from "../common/data/training";
import {
  convertTimeToHumanReadable,
  convertTimeOffsetToHumanReadable,
  autoFillHttp,
} from "../common/utils";
import {
  JOB_STATUS_DESC_NEWEST,
  PLATFORM_AIQICHA,
  PLATFORM_BOSS,
  PLATFORM_JOBSDB,
  PLATFORM_LIEPIN,
} from "./common";
import {
  genJobItemIdWithSha256,
  genCompanyIdWithSha256,
  saveCompany,
  genSha256,
  companyNameConvert,
} from "./commonDataHandler";
import { httpFetchGetText } from "../common/api/common";

import { logoBase64 } from "./assets/logo";
import $ from "jquery";
import { CompanyApi } from "../common/api";
import { Company } from "../common/data/domain/company";
import { errorLog } from "../common/log";

const ACTIVE_TIME_MATCH = /(?<num>[0-9\.]*)/;

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
    let jobItemIdSha256 = genJobItemIdWithSha256(jobId);
    //TODO 需要考虑如何使用公司全称
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
  maximizeDiv.textContent = "⬜";
  menuDiv.appendChild(maximizeDiv);

  const closeDiv = document.createElement("div");
  closeDiv.style = "font-size: 20px;padding: 5px;";
  closeDiv.textContent = "✖️";
  closeDiv.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    commentWrapperDiv.removeChild(dialogDiv);
  });
  menuDiv.appendChild(closeDiv);

  dialogDiv.append(menuDiv);
  const titleDiv = document.createElement("div");
  titleDiv.style = "font-size: 15px;text-align: left;padding: 5px;";
  titleDiv.textContent = dialogTitle;
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
  copmmentButtonDiv.textContent = buttonLabel;
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

//请求中断列表
let abortFunctionHandlerMap = new Map();

export function renderFunctionPanel(
  list,
  getListItem,
  { platform, getCompanyInfoFunction } = {}
) {
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
    functionPanelDiv.onclick = (event) => {
      event.stopPropagation();
    };
    functionPanelDiv.appendChild(createLogo());
    functionPanelDiv.appendChild(
      createCompanyInfo(item, {
        getCompanyInfoFunction: getCompanyInfoFunction,
      })
    );
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
  firstBrowseTimeTag.textContent +=
    "【" +
    firstBrowseTimeHumanReadable +
    "展示过(共" +
    jobDTO.browseCount +
    "次)】";
  firstBrowseTimeTag.classList.add("__first_browse_time");
  return firstBrowseTimeTag;
}

function createCompanyInfo(item, { getCompanyInfoFunction } = {}) {
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
    if (mainChannelDiv.contains(fixValidHummanButton)) {
      mainChannelDiv.removeChild(fixValidHummanButton);
    }
    quickSearchButtonLoading.textContent = `🔎正查询公司全称⌛︎`;
    if (mainChannelDiv.contains(quickSearchButton)) {
      mainChannelDiv.removeChild(quickSearchButton);
    }
    mainChannelDiv.appendChild(quickSearchButtonLoading);
    let companyName = item.jobCompanyName;
    fixValidHummanButton.textContent =
      "一直查询失败？点击该按钮去尝试解除人机验证吧！";
    if (getCompanyInfoFunction) {
      let targetCompanyName = await getCompanyInfoFunction(
        item.jobCompanyApiUrl
      );
      if (targetCompanyName) {
        companyName = targetCompanyName;
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
      otherChannelDiv.appendChild(createCompanyReputation(companyName));
      otherChannelDiv.appendChild(createSearchCompanyLink(companyName));
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

const AIQICHA_PAGE_DATA_MATCH = /window.pageData = (?<data>\{.*\})/;

async function asyncRenderCompanyInfo(
  div,
  keyword,
  forceSyncData,
  quickSearchHandle
) {
  try {
    let convertdCompanyName = companyNameConvert(keyword);
    //查询数据库是否有公司信息
    let company = await CompanyApi.getCompanyById(
      genSha256(convertdCompanyName) + ""
    );
    let now = dayjs();
    if (
      !forceSyncData &&
      company &&
      now.isBefore(dayjs(company.updateDatetime).add(60, "day"))
    ) {
      //skip
    } else {
      //数据过期时间设置为60天
      //数据库没有数据或数据过期了，则进行网络查询，保存数据到数据库
      let companyInfo = await getCompanyInfoByAiqicha(keyword);
      if (companyInfo) {
        let companyInfoDetail = await getCompanyInfoDetailByAiqicha(
          companyInfo.pid
        );
        let companyDetail = companyInfoDetail;
        companyDetail.selfRiskTotal = companyInfo?.risk?.selfRiskTotal;
        companyDetail.unionRiskTotal = companyInfo?.risk?.unionRiskTotal;
        companyDetail.sourceUrl = `https://aiqicha.baidu.com/company_detail_${companyDetail.pid}`;
        await saveCompany(companyDetail, PLATFORM_AIQICHA);
        company = await CompanyApi.getCompanyById(
          genSha256(convertdCompanyName) + ""
        );
      } else {
        throw "company search fail";
      }
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
function createCompanyInfoDetail(company, quickSearchHandle) {
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
          `<div><div class="__company_info_quick_search_item_label">成立时间：</div>${dayjs(
            company.companyStartDate
          ).format("YYYY-MM-DD")}</div>`
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
    )}" target = "_blank"; ref = "noopener noreferrer">${
      company.companyWebSite
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
          `<div><div class="__company_info_quick_search_item_label">官网：</div>${websiteElement}</div>`
        )
      )
  );
  contentDiv.append(
    $(`<div class="__company_info_quick_search_item"></div>`)
      .append(
        $(
          `<div><div class="__company_info_quick_search_item_label">社保人数：</div>${
            company.companyInsuranceNum ?? "-"
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
      .append(
        $(
          `<div><div class="__company_info_quick_search_item_label">数据同步时间：</div><div class="__company_info_quick_search_item_value">${convertTimeOffsetToHumanReadable(
            company.updateDatetime
          )}</div></div>`
        ).append(syncDataButton)
      )
  );
  return contentDiv[0];
}

async function getCompanyInfoByAiqicha(keyword) {
  const decode = encodeURIComponent(keyword);
  const url = `https://aiqicha.baidu.com/s?q=${decode}`;
  let abortFunctionHandler = null;
  const result = await httpFetchGetText(url, (abortFunction) => {
    abortFunctionHandler = abortFunction;
    //加入请求手动中断列表
    abortFunctionHandlerMap.set(abortFunctionHandler, null);
  });
  //请求正常结束，从手动中断列表中移除
  abortFunctionHandlerMap.delete(abortFunctionHandler);
  let data = JSON.parse(result.match(AIQICHA_PAGE_DATA_MATCH).groups["data"]);
  let resultList = data.result.resultList;
  for (let i = 0; i < resultList.length; i++) {
    let companyInfo = resultList[i];
    if (isCompanyNameSame(companyInfo.titleName, keyword)) {
      return companyInfo;
    }
  }
  return null;
}

/**
 * 公司名对比，将中文括号进行替换英文括号，然后进行对比
 * @param {*} name1
 * @param {*} name2
 * @returns
 */
function isCompanyNameSame(name1, name2) {
  return (
    name1.replaceAll("（", "(").replaceAll("）", ")") ==
    name2.replaceAll("（", "(").replaceAll("）", ")")
  );
}

async function getCompanyInfoDetailByAiqicha(pid) {
  const url = `https://aiqicha.baidu.com/company_detail_${pid}`;
  let abortFunctionHandler = null;
  const result = await httpFetchGetText(url, (abortFunction) => {
    abortFunctionHandler = abortFunction;
    //加入请求手动中断列表
    abortFunctionHandlerMap.set(abortFunctionHandler, null);
  });
  //请求正常结束，从手动中断列表中移除
  abortFunctionHandlerMap.delete(abortFunctionHandler);
  let data = JSON.parse(result.match(AIQICHA_PAGE_DATA_MATCH).groups["data"]);
  let companyInfoDetail = data.result;
  return companyInfoDetail;
}

function createSearchCompanyLink(keyword) {
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

function createCompanyReputation(keyword) {
  const dom = document.createElement("div");
  dom.className = "__company_info_quick_search_item";
  let labelDiv = document.createElement("div");
  labelDiv.className = "__company_info_quick_search_item_label";
  labelDiv.textContent = "公司风评检测：";
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
  div.replaceChildren();
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
  aTag.textContent = emoji + label;
  aTag.addEventListener("click", (event) => {
    if (callback) {
      callback(event);
    }
    event.stopPropagation();
  });
  return aTag;
}
