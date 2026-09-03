import { apiRequest } from "./client";
import type { User } from "@/types/models";

export function login(phone: string, password: string) {
  return apiRequest<{ user: User; token: string }>("/api/auth/login", {
    method: "POST",
    body: { phone, password },
    auth: false,
  });
}

export function register(input: { name: string; phone: string; email?: string; password: string; role?: string }) {
  return apiRequest<{ user: User; token: string }>("/api/auth/register", {
    method: "POST",
    body: input,
    auth: false,
  });
}

export function me() {
  return apiRequest<{ userId: string; role: string }>("/api/auth/me");
}
