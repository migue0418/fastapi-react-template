export type RoleOption = {
  id: number;
  name: string;
  description: string;
};

export type UserListItem = {
  id: number;
  username: string;
  full_name: string | null;
  email: string | null;
  is_active: boolean;
  roles: string[];
};

export type UserDetail = UserListItem & {
  role_ids: number[];
};

export type CreateUserRequest = {
  username: string;
  password: string;
  full_name: string | null;
  email: string | null;
  is_active: boolean;
  role_ids: number[];
};

export type UpdateUserRequest = {
  username: string;
  full_name: string | null;
  email: string | null;
  is_active: boolean;
  role_ids: number[];
};
