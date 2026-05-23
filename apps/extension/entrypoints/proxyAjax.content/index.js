import '@webcomponents/custom-elements';
import { handleJobDetail } from '../content/plantforms/boss/index.js';
import { handleBossRecommendData } from '../content/plantforms/boss/recommend.js';
import { getJob51Data } from '../content/plantforms/job51/index.js';
import { getJobsdbData } from '../content/plantforms/jobsdb/index.js';
import { getLiepinData } from '../content/plantforms/liepin/index.js';
import { getZhiLianData } from '../content/plantforms/zhilian/index.js';
import { getLaGouData } from '../content/plantforms/lagou/index.js';
import { handle as aiqichaHandle } from '../content/company/plantforms/aiqicha/index.js';
import { getJobOnlineData } from '../content/plantforms/jobonline/index.js';
import { getGgfwHrssGdData } from '../content/plantforms/ggfw_hrss_gd/index.js';
import $ from 'jquery';
import { initBridge } from '../../common/api/common.js';

export default defineContentScript({
  // Set manifest options
  matches: [
    'https://www.zhipin.com/*',
    'https://www.zhaopin.com/*',
    'https://we.51job.com/*',
    'https://www.lagou.com/*',
    'https://hk.jobsdb.com/*',
    'https://www.liepin.com/*',
    'https://aiqicha.baidu.com/*',
    'https://www.jobonline.cn/*',
    'https://ggfw.hrss.gd.gov.cn/*',
  ],
  runAt: 'document_start',

  main(ctx) {
    console.log(`[Inject] proxy ajax content js`);
    (async () => {
      await initBridge();
      // Executed when content script is loaded, can be async
      // 这里的 window 和页面的 window 不是同一个
      window.$ = window.jQuery = $;
      const location = window.location;
      const pathname = location.pathname;
      window.addEventListener('ajaxGetData', async function (e) {
        const data = e?.detail;
        if (!data) return;
        const responseURL = data?.responseURL;
        if (responseURL) {
          // boss直聘推荐页/搜索页接口
          if (
            pathname == '/web/geek/job' ||
            pathname == '/web/geek/jobs' ||
            pathname == '/web/geek/job-recommend'
          ) {
            if (
              responseURL.indexOf('/wapi/zpgeek/pc/recommend/job/list.json') !==
                -1 ||
              responseURL.indexOf('/search/joblist.json') !== -1
            ) {
              const url = new URL(responseURL);
              let page = Number.parseInt(url.searchParams.get('page'));
              page = Number.isNaN(page) ? 1 : page;
              let pageSize = Number.parseInt(url.searchParams.get('pageSize'));
              pageSize = Number.isNaN(pageSize) ? 15 : pageSize;
              handleBossRecommendData(
                JSON.parse(data?.response)?.zpData?.jobList,
                page,
                pageSize
              );
            } else if (
              responseURL.indexOf('/wapi/zpgeek/job/detail.json') !== -1
            ) {
              const jobInfo = JSON.parse(data?.response)?.zpData?.jobInfo;
              await handleJobDetail(jobInfo);
            } else {
              //skip
            }
          }

          // 智联招聘接口
          if (responseURL.indexOf('/search/positions') !== -1) {
            getZhiLianData(data?.response, true);
          }

          // 前程无忧接口
          if (responseURL.indexOf('/api/job/search-pc') !== -1) {
            getJob51Data(data?.response, true);
          }

          // 拉勾网接口
          if (responseURL.indexOf('/jobs/v2/positionAjax.json') !== -1) {
            /**
             * Question: 接口响应是加密的，为什么这里拿到的是解密后的？
             * 拉勾的加密是自己重写了 XMLHttpRequest，在 send 前进行加密，接受到响应后解密，再派发事件出去
             * 由于拉勾的重写在 proxyAjax 之前运行，所以这里拿到的是解密后的数据
             */
            // TODO 这里拿到的还是加密的数据，需要研究
            getLaGouData(data?.response);
          }

          // jobsdb
          if (responseURL.indexOf('/api/jobsearch/v5/search') !== -1) {
            getJobsdbData(data?.response);
          }

          // liepin
          if (
            responseURL.endsWith('/api/com.liepin.searchfront4c.pc-search-job')
          ) {
            getLiepinData(data?.response);
          }

          // jobonline
          if (
            responseURL.indexOf(
              '/jobtbao-es-api/elastic/api/position/common/v1/showlist?bodytarget=INDEX_PAGE'
            ) !== -1
          ) {
            getJobOnlineData(data?.response);
          }

          // ggfwHrssGd
          if (
            responseURL.indexOf(
              '/recruitment/internet/main/internet/retrieval/c/recruitment/homepage/positions'
            ) !== -1
          ) {
            getGgfwHrssGdData(data?.response);
          }

          // aiqicha
          if (responseURL.indexOf('/s/advanceFilterAjax') !== -1) {
            const list = JSON.parse(data?.response)?.data?.resultList;
            aiqichaHandle(list, false);
          }
        }
      });
      const script = document.createElement('script');
      script.setAttribute('type', 'text/javascript');
      script.setAttribute('src', chrome.runtime.getURL('proxyAjax.js'));
      const insertScript = () => {
        const target = document.head || document.documentElement;
        if (target) {
          target.insertBefore(script, target.firstChild);
        }
      };
      insertScript();
    })();
  },
});
