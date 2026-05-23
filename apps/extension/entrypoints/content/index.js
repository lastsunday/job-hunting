import '@webcomponents/custom-elements';
import { handle as aiqichaHandle } from './company/plantforms/aiqicha/index.js';
import lagouFirstOpen from './plantforms/lagou/firstOpen.js';
import zhilianFirstOpen from './plantforms/zhilian/firstOpen.js';
import '@yaireo/dragsort/dist/dragsort.css';
import '@yaireo/tagify/dist/tagify.css';
import '../assets/css/app.css';
import { initBridge } from '../../common/api/common.js';
import 'analysis';

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

  async main(ctx) {
    console.log(`[Inject] content js`);

    const handleFirstOpen = async (e) => {
      try {
        if (location.host === 'www.lagou.com') {
          // 拉勾首次打开
          await initBridge();
          const data = e?.detail?.lagou?.initialState;
          lagouFirstOpen(data || {});
        } else if (location.host === 'aiqicha.baidu.com') {
          // 爱企查首次打开
          await initBridge();
          const data = e?.detail?.aiqicha?.initialState?.result?.resultList;
          aiqichaHandle(data, true);
        } else if (location.host === 'www.zhaopin.com') {
          // 智联招聘首次打开
          await initBridge();
          const data = e?.detail?.zhipin?.initialState;
          zhilianFirstOpen(data || {});
        }
      } catch (error) {
        console.error('Error handling firstOpen event:', error);
      }
    };

    window.addEventListener('firstOpen', handleFirstOpen);

    const script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('src', chrome.runtime.getURL('firstOpen.js'));
    document.body.appendChild(script);
  },
});
