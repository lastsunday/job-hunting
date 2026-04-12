import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import common_zh from './locales/zh/common.json';
import common_en from './locales/en/common.json';
import login_zh from './locales/zh/login.json';
import login_en from './locales/en/login.json';
import admin_zh from './locales/zh/admin.json';
import admin_en from './locales/en/admin.json';
import statistics_zh from './locales/zh/statistics.json';
import statistics_en from './locales/en/statistics.json';
import job_zh from './locales/zh/job.json';
import job_en from './locales/en/job.json';
import company_zh from './locales/zh/company.json';
import company_en from './locales/en/company.json';
import sync_zh from './locales/zh/sync.json';
import sync_en from './locales/en/sync.json';
import password_zh from './locales/zh/password.json';
import password_en from './locales/en/password.json';

const LOCALE_STORAGE_KEY = 'app-locale';

function getInitialLanguage(): string {
  if (typeof window === 'undefined') return 'zh';
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored === 'en' || stored === 'zh') return stored;
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('en')) return 'en';
  return 'zh';
}

const resources = {
  zh: {
    common: common_zh,
    login: login_zh,
    admin: admin_zh,
    statistics: statistics_zh,
    job: job_zh,
    company: company_zh,
    sync: sync_zh,
    password: password_zh,
  },
  en: {
    common: common_en,
    login: login_en,
    admin: admin_en,
    statistics: statistics_en,
    job: job_en,
    company: company_en,
    sync: sync_en,
    password: password_en,
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: 'zh',
  defaultNS: 'common',
  ns: [
    'common',
    'login',
    'admin',
    'statistics',
    'job',
    'company',
    'sync',
    'password',
  ],
  interpolation: {
    escapeValue: false,
  },
});

export const changeLanguage = (lang: 'zh' | 'en') => {
  i18n.changeLanguage(lang);
  localStorage.setItem(LOCALE_STORAGE_KEY, lang);
};

export default i18n;
