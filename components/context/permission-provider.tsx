"use client";

import { createContext, useContext } from "react";
import type { Permission, PermissionMap, Role } from "@/domains/auth/types";

type PermissionContextValue = {
  role: Role;
  permissions: PermissionMap;
  isAdmin: boolean;
  can: (p: Permission) => boolean;
};

const PermissionContext = createContext<PermissionContextValue | null>(null);

export function PermissionProvider({
  role,
  permissions,
  children,
}: {
  role: Role;
  permissions: PermissionMap;
  children: React.ReactNode;
}) {
  return (
    <PermissionContext.Provider
      value={{
        role,
        permissions,
        isAdmin: role === "admin",
        can: (p) => role === "admin" || permissions[p] === true,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error("usePermissions must be used within PermissionProvider");
  return ctx;
}
