import i18n from 'i18next';
import HttpApi from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';

const LOCALE_STORAGE_KEY = 'app-locale';

function getInitialLanguage(): string {
  if (typeof window === 'undefined') return 'zh';
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored === 'en' || stored === 'zh') return stored;
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('en')) return 'en';
  return 'zh';
}

i18n
  .use(HttpApi)
  .use(initReactI18next)
  .init({
    lng: getInitialLanguage(),
    fallbackLng: 'zh',
    ns: ['common', 'error'],
    defaultNS: 'common',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    interpolation: {
      escapeValue: false,
    },
  });

export const changeLanguage = (lang: 'zh' | 'en') => {
  i18n.changeLanguage(lang);
  localStorage.setItem(LOCALE_STORAGE_KEY, lang);
};

export default i18n;
