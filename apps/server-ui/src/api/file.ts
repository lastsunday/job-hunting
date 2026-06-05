import { postJson, putJson } from './http';

export interface FileItem {
  id: string;
  name?: string;
  sha?: string;
  size?: number;
  is_delete?: boolean;
  create_datetime?: string;
  update_datetime?: string;
}

export interface SearchFileParam {
  page: { num: number; size: number };
  id?: string;
  name?: string;
  sha?: string;
  is_delete?: boolean;
  start_datetime_for_create?: string;
  end_datetime_for_create?: string;
  start_datetime_for_update?: string;
  end_datetime_for_update?: string;
  order_by?: string;
  order_dir?: string;
}

export const fileApi = {
  search: (param: SearchFileParam) =>
    postJson<{ items: FileItem[]; total: number; num: number; size: number }>(
      '/api/file/search',
      param,
    ),

  getContentUrl: (id: string) =>
    `${import.meta.env.VITE_BASE_URL}/api/file/${id}/content`,

  logicDelete: (ids: string[]) =>
    putJson<void>('/api/file/logic_delete', { ids }),
};
