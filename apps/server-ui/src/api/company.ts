import { getJson, postJson, putJson, deleteJson } from '@/api/http';

export interface Company {
  id: string;
  platform?: string;
  name?: string;
  desc?: string;
  start_date?: string;
  status?: string;
  legal_person?: string;
  unified_code?: string;
  web_site?: string;
  source_platform?: string;
  insurance_num?: number;
  self_risk?: number;
  union_risk?: number;
  address?: string;
  scope?: string;
  tax_no?: string;
  industry?: string;
  license_number?: string;
  longitude?: number;
  latitude?: number;
  reg_capital_value?: number;
  reg_capital_currency?: string;
  paidin_capital_value?: number;
  paidin_capital_currency?: string;
  source_url?: string;
  source_record_id?: string;
  source_refresh_datetime?: string;
  create_datetime?: string;
  update_datetime?: string;
}

export interface CreateCompanyRequest {
  id?: string;
  platform?: string;
  name?: string;
  desc?: string;
  start_date?: string;
  status?: string;
  legal_person?: string;
  unified_code?: string;
  web_site?: string;
  source_platform?: string;
  insurance_num?: number;
  self_risk?: number;
  union_risk?: number;
  address?: string;
  scope?: string;
  tax_no?: string;
  industry?: string;
  license_number?: string;
  longitude?: number;
  latitude?: number;
  reg_capital_value?: number;
  reg_capital_currency?: string;
  paidin_capital_value?: number;
  paidin_capital_currency?: string;
  source_url?: string;
  source_record_id?: string;
  source_refresh_datetime?: string;
}

export interface UpdateCompanyRequest {
  platform?: string;
  name?: string;
  desc?: string;
  start_date?: string;
  status?: string;
  legal_person?: string;
  unified_code?: string;
  web_site?: string;
  source_platform?: string;
  insurance_num?: number;
  self_risk?: number;
  union_risk?: number;
  address?: string;
  scope?: string;
  tax_no?: string;
  industry?: string;
  license_number?: string;
  longitude?: number;
  latitude?: number;
  reg_capital_value?: number;
  reg_capital_currency?: string;
  paidin_capital_value?: number;
  paidin_capital_currency?: string;
  source_url?: string;
  source_record_id?: string;
  source_refresh_datetime?: string;
}

export const companyApi = {
  getById: (id: string) => getJson<Company>(`/api/company/${id}`),

  create: (data: CreateCompanyRequest) =>
    postJson<Company>('/api/company', data),

  update: (id: string, data: UpdateCompanyRequest) =>
    putJson<Company>(`/api/company/${id}`, data),

  delete: (id: string) => deleteJson<void>(`/api/company/${id}`),
};
