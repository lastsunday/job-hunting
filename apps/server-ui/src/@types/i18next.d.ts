import 'i18next';
import common_en from '../../public/locales/en/common.json';
import login_en from '../../public/locales/en/login.json';
import admin_en from '../../public/locales/en/admin.json';
import statistics_en from '../../public/locales/en/statistics.json';
import job_en from '../../public/locales/en/job.json';
import company_en from '../../public/locales/en/company.json';
import sync_en from '../../public/locales/en/sync.json';
import password_en from '../../public/locales/en/password.json';

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
