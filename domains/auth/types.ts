export type Permission =
  | "read_creators"
  | "edit_creators"
  | "read_brands"
  | "edit_brands"
  | "read_deals"
  | "edit_deals"
  | "read_events"
  | "edit_events"
  | "read_communication"
  | "edit_communication"
  | "read_integrations"
  | "edit_integrations";

export type Role = "admin" | "member";

export type PermissionMap = Record<Permission, boolean>;

export type AuthContext = {
  userId: string;
  agencyId: string;
  displayName: string | null;
  role: Role;
  permissions: PermissionMap;
};

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  fullName: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  createdAt: string;
}
