import { getJson } from '@/api/http';

export interface StatItem {
  name: string;
  value: number;
}

export interface DailyBreakdownItem {
  date: string;
  status: string;
  value: number;
}

export interface YearQuery {
  year?: number;
}

export const jobStatsApi = {
  getScanTime: (year?: number) =>
    getJson<StatItem[]>('/api/job/statistics/scan-time', { year }),

  getSalary: () => getJson<StatItem[]>('/api/job/statistics/salary'),

  getLocation: () => getJson<StatItem[]>('/api/job/statistics/location'),

  getPlatform: () => getJson<StatItem[]>('/api/job/statistics/platform'),

  getDegree: () => getJson<StatItem[]>('/api/job/statistics/degree'),

  getYear: () => getJson<StatItem[]>('/api/job/statistics/year'),
};

export const companyStatsApi = {
  getInsurance: () => getJson<StatItem[]>('/api/company/statistics/insurance'),

  getIndustry: () => getJson<StatItem[]>('/api/company/statistics/industry'),

  getStatus: () => getJson<StatItem[]>('/api/company/statistics/status'),

  getSourceUpdate: (year?: number) =>
    getJson<StatItem[]>('/api/company/statistics/source-update', { year }),
};

export const taskStatsApi = {
  getStatusDistribution: (days?: number) =>
    getJson<StatItem[]>('/api/task/statistics/status', { days }),

  getTypeDistribution: (days?: number) =>
    getJson<StatItem[]>('/api/task/statistics/type', { days }),

  getDailyCount: (days?: number) =>
    getJson<StatItem[]>('/api/task/statistics/daily-count', { days }),

  getDailyBreakdown: (days?: number) =>
    getJson<DailyBreakdownItem[]>('/api/task/statistics/daily-breakdown', { days }),
};
