import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import SettingView from '../views/SettingView.vue'
import CompanyTagView from '../views/CompanyTagView.vue'
import CompanyView from '../views/CompanyView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView
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
    path: '/setting',
    name: 'setting',
    component: SettingView
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
