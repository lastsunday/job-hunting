import { getBossData } from "./plantforms/boss/index.js";
import { handleBossRecommendData } from "./plantforms/boss/recommend.js"
import { getZhiLianData } from "./plantforms/zhilian/index.js";
import { getJob51Data } from "./plantforms/job51/index.js";
import { getLaGouData } from "./plantforms/lagou/index.js";
import { getJobsdbData } from "./plantforms/jobsdb/index.js";
import { getLiepinData } from "./plantforms/liepin/index.js";
import zhilianFirstOpen from "./plantforms/zhilian/firstOpen.js";
import lagouFirstOpen from "./plantforms/lagou/firstOpen.js";

import { handle as aiqichaHandle } from "./company/plantforms/aiqicha/index.js"

import { createLink, createScript } from "../common/utils.js";
import $ from "jquery";
import { initBridge } from "../common/api/common.js";

import "@yaireo/tagify/dist/tagify.css";
import "@yaireo/dragsort/dist/dragsort.css";
import "../assets/css/app.css";

(async function () {
  // 这里的 window 和页面的 window 不是同一个
  window.$ = window.jQuery = $;
  const head = document.head;
  // eslint-disable-next-line no-undef
  const proxyScript = createScript(chrome.runtime.getURL("proxyAjax.js"));
  // eslint-disable-next-line no-undef
  const styleLink = createLink(chrome.runtime.getURL("style.css"));
  head.appendChild(styleLink);

  if (head.firstChild) {
    // proxyScript 要保证在第一个插入
    head.insertBefore(proxyScript, head.firstChild);
  } else {
    head.appendChild(proxyScript);
  }

  window.addEventListener("ajaxGetData", function (e) {
    const data = e?.detail;
    if (!data) return;
    const responseURL = data?.responseURL;
    if (responseURL) {
      // boss直聘接口
      if (responseURL.indexOf("/search/joblist.json") !== -1) {
        getBossData(data?.response);
      }

      // boss直聘推荐页接口
      if (responseURL.indexOf("/wapi/zpgeek/pc/recommend/job/list.json") !== -1) {
        handleBossRecommendData(JSON.parse(data?.response)?.zpData?.jobList);
      }

      // 智联招聘接口
      if (responseURL.indexOf("/search/positions") !== -1) {
        getZhiLianData(data?.response, true);
      }

      // 前程无忧接口
      if (responseURL.indexOf("/api/job/search-pc") !== -1) {
        getJob51Data(data?.response, true);
      }

      // 拉勾网接口
      if (responseURL.indexOf("/jobs/v2/positionAjax.json") !== -1) {
        /**
         * Question: 接口响应是加密的，为什么这里拿到的是解密后的？
         * 拉勾的加密是自己重写了 XMLHttpRequest，在 send 前进行加密，接受到响应后解密，再派发事件出去
         * 由于拉勾的重写在 proxyAjax 之前运行，所以这里拿到的是解密后的数据
         */
        getLaGouData(data?.response);
      }

      // jobsdb
      if (responseURL.indexOf("/api/chalice-search/v4/search") !== -1) {
        getJobsdbData(data?.response);
      }

      // liepin
      if (responseURL.indexOf("/api/com.liepin.searchfront4c.pc-search-job") !== -1) {
        getLiepinData(data?.response);
      }

      // aiqicha
      if (responseURL.indexOf("/s/advanceFilterAjax") !== -1) {
        let list = JSON.parse(data?.response)?.data?.resultList;
        aiqichaHandle(list, false);
      }
    }
  });

  window.addEventListener("proxyScriptLoaded", async function (e) {
    await initBridge();
    // 不通过直接注入脚本的方式处理 ssr 页面，否则一些引入的模块需要重新打包
    if (location.host === "www.zhaopin.com") {
      // 智联招聘首次打开
      const data = e?.detail?.zhipin?.initialState;
      zhilianFirstOpen(data || {});
    }

    if (location.host === "www.lagou.com") {
      // 拉勾首次打开
      const data = e?.detail?.lagou?.initialState;
      lagouFirstOpen(data || {});
    }

    if (location.host === "aiqicha.baidu.com") {
      // 爱企查首次打开
      const data = e?.detail?.aiqicha?.initialState?.result?.resultList;
      aiqichaHandle(data, true);
    }
  });
})();
