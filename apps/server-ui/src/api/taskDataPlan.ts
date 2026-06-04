import { getJson, postJson, putJson, deleteJson } from '@/api/http';

export interface TaskDataPlanDetail {
  id: string;
  plan_id?: string;
  username?: string;
  repo_name?: string;
  repo_type?: string;
  type?: string;
  enable?: boolean;
  config?: string;
  cron?: string;
  create_datetime?: string;
  update_datetime?: string;
}

export interface CreateTaskDataPlanRequest {
  type?: string;
  enable?: boolean;
  cron?: string;
  username?: string;
  repo_name?: string;
  repo_type?: string;
  token?: string;
  url?: string;
  task_type_list?: string[];
}

export interface UpdateTaskDataPlanRequest {
  type?: string;
  enable?: boolean;
  cron?: string;
  username?: string;
  repo_name?: string;
  repo_type?: string;
  token?: string;
  url?: string;
  task_type_list?: string[];
}

export const taskDataPlanApi = {
  search: (params: {
    page: { num: number; size: number };
    username?: string;
    repo_name?: string;
    repo_type?: string;
    type?: string;
    enable?: boolean;
  }) =>
    postJson<{ items: TaskDataPlanDetail[]; total: number }>(
      '/api/task_data_plan/search',
      params,
    ),

  getById: (id: string) =>
    getJson<TaskDataPlanDetail>(`/api/task_data_plan/${id}`),

  create: (data: CreateTaskDataPlanRequest) =>
    postJson<TaskDataPlanDetail>('/api/task_data_plan', data),

  update: (id: string, data: UpdateTaskDataPlanRequest) =>
    putJson<TaskDataPlanDetail>(`/api/task_data_plan/${id}`, data),

  delete: (id: string) => deleteJson<void>(`/api/task_data_plan/${id}`),
};
