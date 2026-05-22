import { api } from "@/shared/api/http";
import type {
  CreateUserRequest,
  RoleOption,
  UpdateUserRequest,
  UserDetail,
  UserListItem,
} from "@/features/users/types";

export function listUsersRequest(): Promise<UserListItem[]> {
  return api.get<UserListItem[]>("/users");
}

export function getUserRequest(userId: number): Promise<UserDetail> {
  return api.get<UserDetail>(`/users/${userId}`);
}

export function listRolesRequest(): Promise<RoleOption[]> {
  return api.get<RoleOption[]>("/roles");
}

export function createUserRequest(payload: CreateUserRequest): Promise<UserDetail> {
  return api.post<UserDetail, CreateUserRequest>("/users", payload);
}

export function updateUserRequest(
  userId: number,
  payload: UpdateUserRequest,
): Promise<UserDetail> {
  return api.put<UserDetail, UpdateUserRequest>(`/users/${userId}`, payload);
}

export async function deleteUserRequest(userId: number): Promise<void> {
  await api.delete<void>(`/users/${userId}`);
}

export async function resetUserPasswordRequest(
  userId: number,
  newPassword: string,
): Promise<void> {
  await api.post<void, { new_password: string }>(`/users/${userId}/reset-password`, {
    new_password: newPassword,
  });
}
