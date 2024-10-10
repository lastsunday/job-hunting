import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import sidepanel from './App.vue'
import router from "./router";
import { initBridge } from '../common/api/common';
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import Particles from "@tsparticles/vue3";
import { loadFull } from "tsparticles";

async function init() {
  await initBridge();
  const app = createApp(sidepanel)
  app.use(ElementPlus, {
    locale: zhCn,
  })
  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
  }
  app.use(Particles, {
    init: async engine => {
      await loadFull(engine); // you can load the full tsParticles library from "tsparticles" if you need it
    },
  });
  app.use(router)
  app.mount('body');
}
init();