import { initBridge } from '@/common/api/common';
import { errorLog } from '@/common/log';
import '@ant-design/v5-patch-for-react-19';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/es/locale/zh_CN';
import 'dayjs/locale/zh-cn';
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'uno.css';
import './index.css';
const App = React.lazy(() => import('./App.tsx'));

async function init() {
  try {
    await initBridge();
  } catch (error) {
    errorLog('Failed to initialize the bridge:', error);
  }
  const isDevelopment = process.env.NODE_ENV === 'development';
  const rootElement = document.getElementById('root');
  if (rootElement) {
    createRoot(rootElement).render(
      isDevelopment ? (
        <StrictMode>
          <ConfigProvider locale={zhCN}>
            <React.Suspense>
              <App />
            </React.Suspense>
          </ConfigProvider>
        </StrictMode>
      ) : (
        <ConfigProvider locale={zhCN}>
          <React.Suspense>
            <App />
          </React.Suspense>
        </ConfigProvider>
      )
    );
  } else {
    errorLog('Failed to find the root element.');
  }
}
init();
