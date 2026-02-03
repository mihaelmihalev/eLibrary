import { api } from "./client";

export type LoginDto = { email: string; password: string };
export type RegisterDto = { email: string; password: string; fullName?: string };
export type TokenDto = { accessToken: string };
export type MeDto = { id: string; email: string; fullName?: string; roles: string[] };

export async function register(data: RegisterDto) {
  await api.post("/auth/register", data);
}

export async function login(data: LoginDto) {
  const res = await api.post<TokenDto>("/auth/login", data);
  localStorage.setItem("accessToken", res.data.accessToken);
  return res.data;
}

export async function me() {
  const res = await api.get<MeDto>("/auth/me");
  return res.data;
}

export function logout() {
  localStorage.removeItem("accessToken");
}
