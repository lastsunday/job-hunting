import '@webcomponents/custom-elements';
import { handle as aiqichaHandle } from "./company/plantforms/aiqicha/index.js";
import lagouFirstOpen from "./plantforms/lagou/firstOpen.js";
import zhilianFirstOpen from "./plantforms/zhilian/firstOpen.js";
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
    "https://ggfw.hrss.gd.gov.cn/*",
  ],

  main(ctx) {
    console.log(`[Inject] content js`);
    (async () => {
      window.addEventListener("firstOpen", async function (e) {
        try {
          if (location.host === "www.lagou.com") {
            await initBridge();
            // 拉勾首次打开
            const data = e?.detail?.lagou?.initialState;
            lagouFirstOpen(data || {});
          }

          if (location.host === "aiqicha.baidu.com") {
            await initBridge();
            // 爱企查首次打开
            const data = e?.detail?.aiqicha?.initialState?.result?.resultList;
            aiqichaHandle(data, true);
          }

          if (location.host === "www.zhaopin.com") {
            await initBridge();
            // 智联招聘首次打开
            const data = e?.detail?.zhipin?.initialState;
            zhilianFirstOpen(data || {});
          }
        } catch (e) {
          console.log(e);
        }
      });

      const script = document.createElement('script');
      script.setAttribute('type', 'text/javascript');
      script.setAttribute('src', chrome.runtime.getURL('firstOpen.js'));
      document.body.appendChild(script);
    })();
  },
});