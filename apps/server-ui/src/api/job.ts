import { getJson, postJson, putJson, deleteJson } from '@/api/http';

export interface Job {
  id: string;
  platform?: string;
  url?: string;
  name?: string;
  company_name?: string;
  location_name?: string;
  address?: string;
  longitude?: number;
  latitude?: number;
  description?: string;
  degree_name?: string;
  year?: number;
  salary_min?: number;
  salary_max?: number;
  salary_total_month?: number;
  first_publish_datetime?: string;
  boss_name?: string;
  boss_company_name?: string;
  boss_position?: string;
  create_datetime?: string;
  update_datetime?: string;
  is_full_company_name?: boolean;
  first_scan_datetime?: string;
  skill_tag?: string;
  welfare_tag?: string;
}

export interface CreateJobRequest {
  id?: string;
  platform?: string;
  url?: string;
  name?: string;
  company_name?: string;
  location_name?: string;
  address?: string;
  longitude?: number;
  latitude?: number;
  description?: string;
  degree_name?: string;
  year?: number;
  salary_min?: number;
  salary_max?: number;
  salary_total_month?: number;
  first_publish_datetime?: string;
  boss_name?: string;
  boss_company_name?: string;
  boss_position?: string;
  is_full_company_name?: boolean;
  skill_tag?: string;
  welfare_tag?: string;
}

export interface UpdateJobRequest {
  platform?: string;
  url?: string;
  name?: string;
  company_name?: string;
  location_name?: string;
  address?: string;
  longitude?: number;
  latitude?: number;
  description?: string;
  degree_name?: string;
  year?: number;
  salary_min?: number;
  salary_max?: number;
  salary_total_month?: number;
  first_publish_datetime?: string;
  boss_name?: string;
  boss_company_name?: string;
  boss_position?: string;
  is_full_company_name?: boolean;
  skill_tag?: string;
  welfare_tag?: string;
}

export const jobApi = {
  getById: (id: string) => getJson<Job>(`/api/job/${id}`),

  create: (data: CreateJobRequest) => postJson<Job>('/api/job', data),

  update: (id: string, data: UpdateJobRequest) =>
    putJson<Job>(`/api/job/${id}`, data),

  delete: (id: string) => deleteJson<void>(`/api/job/${id}`),
};
