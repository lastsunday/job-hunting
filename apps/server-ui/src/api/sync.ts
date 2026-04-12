import { getJson, postJson } from '@/api/http';

export interface SyncGitParam {
  base_url?: string;
  owner: string;
  repo_name: string;
  token?: string;
  start_datetime?: string;
  end_datetime?: string;
}

export interface SyncStatus {
  last_sync_job?: string;
  last_sync_company?: string;
  scheduler_running: boolean;
  total_jobs: number;
  total_companies: number;
}

export interface SyncConfig {
  git_enabled: boolean;
  git_base_url: string;
  git_token?: string;
  default_repo?: string;
  schedule_enabled: boolean;
  schedule_cron: string;
  sync_jobs: boolean;
  sync_companies: boolean;
}

export interface ImportResult {
  success: boolean;
  valid_result: boolean;
  data_version: number;
  actual_version: number;
  lack_columns: string[];
  valid_columns: string[];
  total: number;
  imported: number;
  updated: number;
  cost_time: number;
  errors: string[];
  warnings: string[];
}

export interface SyncResult {
  success: boolean;
  total_files: number;
  total_records: number;
  imported: number;
  updated: number;
  errors: string[];
}

export const syncApi = {
  getStatus: () => getJson<SyncStatus>('/api/sync/status'),

  getConfig: () => getJson<SyncConfig>('/api/sync/config'),

  syncGitJobs: (param: SyncGitParam) =>
    postJson<SyncResult>('/api/sync/git/jobs', param),

  syncGitCompanies: (param: SyncGitParam) =>
    postJson<SyncResult>('/api/sync/git/companies', param),

  importFile: (dataType: string, fileBase64: string) =>
    postJson<ImportResult>('/api/sync/file/import', {
      data_type: dataType,
      file: fileBase64,
    }),
};
