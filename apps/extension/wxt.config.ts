import reactOxc from '@vitejs/plugin-react-oxc';
import { copyFileSync, existsSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import wasm from 'vite-plugin-wasm';
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/unocss', '@wxt-dev/module-react'],
  zip: {
    artifactTemplate: 'job-hunting-extension-{{version}}-{{browser}}.zip',
  },
  unocss: {},
  manifest: ({ browser }) => ({
    name: 'job-hunting',
    action: {
      default_title: 'Click to open admin page',
    },
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'",
    },
    web_accessible_resources: [
      {
        resources: [
          'proxyAjax.js',
          'firstOpen.js',
          'CHANGELOG.md',
          'package.json',
          'LICENSE',
        ],
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
      },
    ],
    permissions: browser === 'firefox'
      ? [
          'storage',
          'unlimitedStorage',
          'webRequest',
          'declarativeNetRequest',
          'debugger',
          'cookies',
        ]
      : [
          'webRequest',
          'offscreen',
          'unlimitedStorage',
          'declarativeNetRequestWithHostAccess',
          'declarativeNetRequestFeedback',
          'debugger',
          'cookies',
          'storage',
        ],
    host_permissions: ['http://*/', 'https://*/'],
    browser_specific_settings:
      browser === 'firefox'
        ? { gecko: { id: '{73047bbe-2a75-4f4e-ba8e-31c1e51b44f6}' } }
        : undefined,
    key:
      browser === 'firefox'
        ? undefined
        : 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4sziiWIatNirncnJmxcaJVqmDELP+eQo4C1ZYCCgGJEkAEgDlZpIlKuPS5JRe1h91vo9kPmivK833Trrm1tQtfoaCNxo+oFGTJfYJxKDWE82cMbM1gWsL7HkeiU7nJ7U2EBDA1hKT2TkGO0k5JVwgPpvaOomAFfB9/14hcPwYuDf/3eeRRTzLDK/LpCbt821jmrPlOZ9jgk0MPNxJ7BnZf5e6rG90sOdClhe8EYB/7ysXKv0uiYiJdbOLbmWC1WfmabIvJL2SoUAdBQJf4HWgZ+ZmxMwgWoAikrbBr0Hug+xDTFgiTJCNCOIbma0M1f7Sf7SP55vcbr1FMsoRfifowIDAQAB',
  }),
  hooks: {
    'build:done'(wxt, output) {
      const extRoot = wxt.config.root;
      const workspaceRoot = resolve(extRoot, '../..');
      const outDir = wxt.config.outDir;
      copyFileSync(
        resolve(extRoot, 'CHANGELOG.md'),
        resolve(outDir, 'CHANGELOG.md'),
      );
      copyFileSync(
        resolve(extRoot, 'package.json'),
        resolve(outDir, 'package.json'),
      );
      copyFileSync(resolve(extRoot, 'LICENSE'), resolve(outDir, 'LICENSE'));
      if (wxt.config.browser === 'firefox') {
        const offscreenHtml = resolve(outDir, 'offscreen.html');
        if (existsSync(offscreenHtml)) {
          unlinkSync(offscreenHtml);
        }
      }
      if (wxt.config.mode == 'production') {
        const nm = resolve(workspaceRoot, 'node_modules');
        copyFileSync(
          resolve(nm, '@electric-sql', 'pglite', 'dist', 'pglite.wasm'),
          resolve(outDir, 'assets', 'pglite.wasm'),
        );
        copyFileSync(
          resolve(nm, '@electric-sql', 'pglite', 'dist', 'pglite.data'),
          resolve(outDir, 'assets', 'pglite.data'),
        );
        copyFileSync(
          resolve(nm, '@electric-sql', 'pglite-tools', 'dist', 'pg_dump.wasm'),
          resolve(outDir, 'assets', 'pg_dump.wasm'),
        );
        copyFileSync(
          resolve(nm, 'libarchive.js', 'dist', 'worker-bundle.js'),
          resolve(outDir, 'worker-bundle.js'),
        );
        copyFileSync(
          resolve(nm, 'libarchive.js', 'dist', 'libarchive.wasm'),
          resolve(outDir, 'libarchive.wasm'),
        );
      }
    },
  },
  vite: () => {
    return {
      define: {
        __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      },
      build: {
        cssMinify: 'lightningcss',
      },
      css: {
        lightningcss: {},
      },
      plugins: () => {
        [reactOxc(), wasm()];
      },
      worker: {
        plugins: () => [wasm()],
        format: 'es',
      },
      optimizeDeps: {
        exclude: [
          '@electric-sql/pglite',
          '@electric-sql/pglite-tools',
          'libarchive.js',
          '@tsparticles/react',
        ],
      },
    };
  },
});
