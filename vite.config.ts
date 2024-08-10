import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import webExtension, { readJsonFile } from 'vite-plugin-web-extension';
import copy from 'rollup-plugin-copy';
import { nodeResolve } from '@rollup/plugin-node-resolve';
const target = process.env.TARGET || 'chrome';

function generateManifest() {
  const manifest = readJsonFile('src/manifest.json');
  const pkg = readJsonFile('package.json');
  return {
    name: pkg.name,
    description: pkg.description,
    version: pkg.version,
    ...manifest,
  };
}

function getBuildOutputDir() {
  if (target === 'firefox') {
    return 'dist-firefox';
  } else {
    return 'dist-chrome';
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __BROWSER__: JSON.stringify(target),
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  build: {
    outDir: getBuildOutputDir(),
    rollupOptions: {},
  },
  plugins: [
    vue(),
    webExtension({
      manifest: generateManifest,
      disableAutoLaunch: true,
      watchFilePaths: ['package.json', 'manifest.json'],
      additionalInputs: [
        'src/offscreen/offscreen.html',
        'src/sidepanel/index.html',
      ],
      browser: process.env.TARGET || 'chrome',
      skipManifestValidation: true,
    }),
    copy({
      targets: [
        { src: 'CHANGELOG.md', dest: getBuildOutputDir() },
        { src: 'package.json', dest: getBuildOutputDir() },
        { src: 'LICENSE', dest: getBuildOutputDir() },
      ],
      // 是否在构建时打印日志信息
      verbose: true
    }),
    nodeResolve({
      // Indicate that we target a browser environment.
      browser: true,
      // Exclude any dependencies except for puppeteer-core.
      // `npm install puppeteer-core` # To install puppeteer-core if needed.
      resolveOnly: ['puppeteer-core'],
    }),
  ],
  optimizeDeps: {
    include: ["leaflet"],
  },
});

