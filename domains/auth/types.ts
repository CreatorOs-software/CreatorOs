export type AuthContext = {
  userId: string;
  agencyId: string;
  displayName: string | null;
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
