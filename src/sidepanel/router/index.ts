import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import SettingView from '../views/SettingView.vue'
import CompanyTagView from '../views/CompanyTagView.vue'
import CompanyView from '../views/CompanyView.vue'
import JobView from '../views/JobView.vue'
import BBSView from '../views/BBSView.vue'
import AssistantView from '../views/AssistantView.vue'
import DataSharePlanView from "../views/DataSharePlanView.vue";

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/job',
    name: 'job',
    component: JobView
  },
  {
    path: '/company',
    name: 'company',
    component: CompanyView
  },
  {
    path: '/companyTag',
    name: 'companyTag',
    component: CompanyTagView
  },
  {
    path: '/bbs',
    name: 'bbs',
    component: BBSView
  },
  {
    path: '/assistant',
    name: 'assistant',
    component: AssistantView
  },
  {
    path: '/setting',
    name: 'setting',
    component: SettingView
  },
  {
    path: '/dataSharePlan',
    name: 'dataSharePlan',
    component: DataSharePlanView
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
