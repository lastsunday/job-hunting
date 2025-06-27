import { LoginParam } from "@/data/login-param";
import { LoginResult } from "@/data/login-result";
import { getJson, postJson } from "./http";
import { UserResult } from "@/data/user-result";

export async function login(param: LoginParam): Promise<LoginResult> {
  return await postJson<LoginResult>("/api/auth/login", param);
}

export async function getUser(): Promise<UserResult> {
  return await getJson<UserResult>("/api/auth/user");
}
