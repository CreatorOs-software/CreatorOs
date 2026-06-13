import type { Permission, PermissionMap, Role } from "./types";

export const ALL_PERMISSIONS: Permission[] = [
  "read_creators", "edit_creators",
  "read_brands", "edit_brands",
  "read_deals", "edit_deals",
  "read_events", "edit_events",
  "read_communication", "edit_communication",
  "read_integrations", "edit_integrations",
];

export const FULL_PERMISSIONS: PermissionMap = Object.fromEntries(
  ALL_PERMISSIONS.map((p) => [p, true]),
) as PermissionMap;

export const EMPTY_PERMISSIONS: PermissionMap = Object.fromEntries(
  ALL_PERMISSIONS.map((p) => [p, false]),
) as PermissionMap;

export function normalizePermissions(raw: Record<string, unknown>): PermissionMap {
  return Object.fromEntries(
    ALL_PERMISSIONS.map((p) => [p, raw[p] === true]),
  ) as PermissionMap;
}

export function can(role: Role, permissions: PermissionMap, permission: Permission): boolean {
  if (role === "admin") return true;
  return permissions[permission] === true;
}

export const PERMISSION_LABELS: Record<Permission, string> = {
  read_creators: "Creator ansehen",
  edit_creators: "Creator bearbeiten",
  read_brands: "Brands ansehen",
  edit_brands: "Brands bearbeiten",
  read_deals: "Deals ansehen",
  edit_deals: "Deals bearbeiten",
  read_events: "Events ansehen",
  edit_events: "Events bearbeiten",
  read_communication: "Inbox ansehen",
  edit_communication: "Inbox bearbeiten",
  read_integrations: "Integrationen ansehen",
  edit_integrations: "Integrationen bearbeiten",
};

export const PERMISSION_GROUPS: { label: string; permissions: [Permission, Permission] }[] = [
  { label: "Creator", permissions: ["read_creators", "edit_creators"] },
  { label: "Brands", permissions: ["read_brands", "edit_brands"] },
  { label: "Deals", permissions: ["read_deals", "edit_deals"] },
  { label: "Events", permissions: ["read_events", "edit_events"] },
  { label: "Inbox", permissions: ["read_communication", "edit_communication"] },
  { label: "Integrationen", permissions: ["read_integrations", "edit_integrations"] },
];
