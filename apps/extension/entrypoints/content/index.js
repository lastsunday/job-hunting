import '@webcomponents/custom-elements';
import { getBossData } from "./plantforms/boss/index.js";
import { handleBossRecommendData } from "./plantforms/boss/recommend.js";
import { getJob51Data } from "./plantforms/job51/index.js";
import { getJobsdbData } from "./plantforms/jobsdb/index.js";
import { getLiepinData } from "./plantforms/liepin/index.js";
import { getZhiLianData } from "./plantforms/zhilian/index.js";
import lagouFirstOpen from "./plantforms/lagou/firstOpen.js";
import { handle as aiqichaHandle } from "./company/plantforms/aiqicha/index.js";
import { getJobOnlineData } from "./plantforms/jobonline/index.js";

import $ from "jquery";

import "@yaireo/dragsort/dist/dragsort.css";
import "@yaireo/tagify/dist/tagify.css";
import "../assets/css/app.css";

import { initBridge } from "../../common/api/common.js";

export default defineContentScript({
  // Set manifest options
  matches: [
    "https://www.zhipin.com/*",
    "https://www.zhaopin.com/*",
    "https://we.51job.com/*",
    "https://www.lagou.com/*",
    "https://hk.jobsdb.com/*",
    "https://www.liepin.com/*",
    "https://aiqicha.baidu.com/*",
    "https://www.jobonline.cn/*",
  ],

  main(ctx) {
    // Executed when content script is loaded, can be async
    // 这里的 window 和页面的 window 不是同一个
    window.$ = window.jQuery = $;
    const script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('src', chrome.runtime.getURL('firstOpen.js'));
    document.body.appendChild(script);

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

        // jobsdb
        if (responseURL.indexOf("/api/chalice-search/v4/search") !== -1) {
          getJobsdbData(data?.response);
        }

        // liepin
        if (responseURL.indexOf("/api/com.liepin.searchfront4c.pc-search-job") !== -1) {
          getLiepinData(data?.response);
        }

        // jobonline
        if (responseURL.indexOf("/jobtbao-es-api/elastic/api/position/common/v1/showlist?bodytarget=INDEX_PAGE") !== -1) {
          getJobOnlineData(data?.response);
        }

        // aiqicha
        if (responseURL.indexOf("/s/advanceFilterAjax") !== -1) {
          let list = JSON.parse(data?.response)?.data?.resultList;
          aiqichaHandle(list, false);
        }
      }
    });

    window.addEventListener("firstOpen", async function (e) {
      try {
        await initBridge();
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
      } catch (e) {
        console.log(e);
      }
    });
  },
});