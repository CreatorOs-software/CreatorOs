import type { PermissionMap, Role } from "@/domains/auth/types";
import type { AvatarConfig } from "@/lib/avatar";

export type AgencyUser = {
  id: string;
  display_name: string | null;
  initials: string | null;
  avatar_config: AvatarConfig | null;
  role: string;
};

export type AgencyMember = {
  id: string;
  display_name: string | null;
  initials: string;
  avatar_config: AvatarConfig | null;
  role: Role;
  permissions: PermissionMap;
  created_at: string;
};

export type AgencyInvitation = {
  id: string;
  agency_id: string;
  email: string;
  role: Role;
  permissions: PermissionMap;
  invited_by: string | null;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

export type CreateInvitationInput = {
  email: string;
  role: Role;
  permissions: PermissionMap;
};
