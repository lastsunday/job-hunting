import axios from "axios";

export interface ApiResult<T> {
  code: number;
  message: string;
  data: T;
}

const KEY_TOKEN = "KEY_TOKEN";

export function setToken(token: string) {
  localStorage.setItem(KEY_TOKEN, token);
}

const instance = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL + "/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
  timeout: 10000,
  validateStatus: () => true,
})

export default instance;
