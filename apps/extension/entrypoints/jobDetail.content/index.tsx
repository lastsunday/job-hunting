import { initBridge } from '@/common/api/common.js';
import { createRoot } from 'react-dom/client';
import 'single-file-core/single-file-bootstrap.js';
import 'uno.css';
import App from './App.tsx';

export default defineContentScript({
  // Set manifest options
  matches: [
    'https://www.zhipin.com/job_detail/*',
    'https://jobs.51job.com/*',
    'https://www.zhaopin.com/jobdetail/*',
    'https://www.liepin.com/lptjob/*',
    'https://www.lagou.com/wn/jobs/*',
    'https://www.jobonline.cn/positionDetail*',
  ],
  async main() {
    await initBridge();
    const rootElement = document.createElement(`div`);
    rootElement.style = 'z-index:9999;position:relative;';
    window.document.body.appendChild(rootElement);
    const root = createRoot(rootElement);
    root.render(<App />);
  },
});
