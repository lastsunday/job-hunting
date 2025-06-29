import { getAccessToken, getRefreshToken, setStoredToken, Token } from "@/hooks/auth";
import axios, { HttpStatusCode } from "axios";

export interface ApiResult<T> {
  code: number;
  message: string;
  data: T;
}

export const instance = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
  timeout: 10000,
  validateStatus: () => true,
})

instance.interceptors.request.use(config => {
  const accessToken = getAccessToken();
  if (accessToken) {
    config.headers.setAuthorization(`Bearer ${accessToken}`);
  }
  return config;
})

instance.interceptors.response.use(async (response) => {
  const { status } = response;
  if (status == HttpStatusCode.Unauthorized) {
    try {
      let token = await refreshToken(getRefreshToken());
      setStoredToken(token);
      return instance(response.config);
    } catch (e) {
      setStoredToken(null);
      throw e;
    }
  } else {
    return response;
  }
});

const refreshToken = async (refresh_token: string | null): Promise<Token> => {
  const { status, data } = await axios.post(`${import.meta.env.VITE_BASE_URL}/api/auth/access_token`, undefined, {
    params: {
      client_id: import.meta.env.VITE_CLIENT_ID,
      client_secret: import.meta.env.VITE_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refresh_token
    },
    headers: {
      "Content-Type": "application/json",
    },
  })
  if (status == HttpStatusCode.Ok || status == HttpStatusCode.BadRequest) {
    if (data) {
      const code = data.code;
      if (code == 0) {
        return data.data;
      } else {
        const message = data.message;
        throw `[${code}] ${message}`;
      }
    } else {
      throw 'invalid data is null';
    }
  } else {
    throw `invalid status code = ${status}`;
  }
}

export async function postJson<T>(url: string, obj: Object): Promise<T> {
  const { status, data } = await instance.post(url, JSON.stringify(obj));
  if (status == HttpStatusCode.Ok || status == HttpStatusCode.BadRequest) {
    if (data) {
      const code = data.code;
      if (code == 0) {
        return data.data;
      } else {
        const message = data.message;
        throw `[${code}] ${message}`;
      }
    } else {
      throw 'invalid data is null';
    }
  } else {
    throw `invalid status code = ${status}`;
  }
}

export async function getJson<T>(url: string, params?: any): Promise<T> {
  const { status, data } = await instance.get(url, { params });
  if (status == HttpStatusCode.Ok || status == HttpStatusCode.BadRequest) {
    if (data) {
      const code = data.code;
      if (code == 0) {
        return data.data;
      } else {
        const message = data.message;
        throw `[${code}] ${message}`;
      }
    } else {
      throw 'invalid data is null';
    }
  } else {
    throw `invalid status code = ${status}`;
  }
}
