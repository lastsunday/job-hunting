import { instance } from "./http";

export * from "./http";
export * from "./query";
export * from "./auth";

export async function getVersion(): Promise<string> {
  const { data } = await instance.get("/version", {
    baseURL: import.meta.env.VITE_BASE_URL
  });
  return data as string;
}
