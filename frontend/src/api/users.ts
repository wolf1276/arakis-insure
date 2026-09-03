import { apiRequest } from "./client";
import type { User, Nominee, Policy, Claim } from "@/types/models";

export function getUser(id: string) {
  return apiRequest<User>(`/api/users/${id}`);
}

export function getUserNominees(id: string) {
  return apiRequest<Nominee[]>(`/api/users/${id}/nominees`);
}

export function addNominee(id: string, input: { name: string; phone: string; relationship: string }) {
  return apiRequest<Nominee>(`/api/users/${id}/nominee`, { method: "POST", body: input });
}

export function getUserPolicies(id: string) {
  return apiRequest<Policy[]>(`/api/users/${id}/policies`);
}

export function getUserClaims(id: string) {
  return apiRequest<Claim[]>(`/api/users/${id}/claims`);
}
