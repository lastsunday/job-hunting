import { postJson } from '@/api/http';

export type TaskType =
  | 'JobDataDownload'
  | 'JobDataMerge'
  | 'CompanyDataDownload'
  | 'CompanyDataMerge';

export type TaskStatus =
  | 'Ready'
  | 'Running'
  | 'Cancel'
  | 'Finished'
  | 'FinishedButError'
  | 'Error';

export interface TaskRunDetail {
  id: string;
  plan_id?: string;
  type?: TaskType;
  data_id?: string;
  status?: TaskStatus;
  error_reason?: string;
  cost_time?: number;
  retry_count?: number;
  create_datetime?: string;
  update_datetime?: string;
  detail_user_name?: string;
  detail_repo_name?: string;
  detail_datetime?: string;
  detail_seq?: number;
  detail_data_count?: number;
  detail_data_page_num?: number;
  detail_data_page_size?: number;
}

export interface SearchTaskParam {
  page: { num: number; size: number };
  type_list?: TaskType[];
  status_list?: TaskStatus[];
  plan_id?: string;
  start_datetime_for_create?: string;
  end_datetime_for_create?: string;
  start_datetime_for_update?: string;
  end_datetime_for_update?: string;
}

export const taskApi = {
  search: (params: SearchTaskParam) =>
    postJson<{ items: TaskRunDetail[]; total: number }>(
      '/api/task/search',
      params,
    ),
};
