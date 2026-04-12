import 'i18next';
import common_en from '../i18n/locales/en/common.json';
import login_en from '../i18n/locales/en/login.json';
import admin_en from '../i18n/locales/en/admin.json';
import statistics_en from '../i18n/locales/en/statistics.json';
import job_en from '../i18n/locales/en/job.json';
import company_en from '../i18n/locales/en/company.json';
import sync_en from '../i18n/locales/en/sync.json';
import password_en from '../i18n/locales/en/password.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common_en;
      login: typeof login_en;
      admin: typeof admin_en;
      statistics: typeof statistics_en;
      job: typeof job_en;
      company: typeof company_en;
      sync: typeof sync_en;
      password: typeof password_en;
    };
  }
}
