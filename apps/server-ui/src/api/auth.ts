import { LoginParam } from "@/data/login-param";
import { LoginResult } from "@/data/login-result";
import { getJson, postJson } from "./http";
import { UserResult } from "@/data/user-result";
import { ResetPasswordParam } from "@/data/reset-password-param";

export async function login(param: LoginParam): Promise<LoginResult> {
  return await postJson<LoginResult>("/api/auth/login", param);
}

export async function getUser(): Promise<UserResult> {
  return await getJson<UserResult>("/api/auth/user");
}

export async function resetPassword(param: ResetPasswordParam): Promise<void> {
  return await postJson<void>("/api/auth/reset_password", param);
}
