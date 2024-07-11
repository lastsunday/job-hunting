import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import webExtension, { readJsonFile } from 'vite-plugin-web-extension';
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
    __HOMEPAGE__: JSON.stringify(process.env.npm_package_homepage),
    __BUGS__: JSON.stringify(process.env.npm_package_bugs),
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
  ],
  optimizeDeps: {
    include: ["leaflet"],
  },
});

