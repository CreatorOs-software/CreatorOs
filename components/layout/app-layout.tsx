"use client";

import { Header } from "./header";
import { AppSidebar } from "./sidebar";
import { PermissionProvider } from "@/components/context/permission-provider";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import type { Role, PermissionMap } from "@/domains/auth/types";

interface AppLayoutProps {
  children: React.ReactNode;
  fullHeight?: boolean;
  user?: { id: string; name?: string; email?: string } | null;
  role?: Role;
  permissions?: PermissionMap;
}

export function AppLayout({
  children,
  fullHeight = false,
  user,
  role = "member",
  permissions,
}: AppLayoutProps) {
  const defaultPermissions = permissions ?? ({} as PermissionMap);

  return (
    <PermissionProvider role={role} permissions={defaultPermissions}>
      <SidebarProvider
        style={{ "--sidebar-width-icon": "4rem" } as React.CSSProperties}
      >
        <AppSidebar />
        <SidebarInset
          className={
            fullHeight ? "h-svh overflow-hidden flex flex-col" : "min-h-svh"
          }
        >
          <Header user={user} />
          <main
            className={`${fullHeight ? "flex-1 min-h-0 overflow-hidden" : ""} px-6 pb-4`}
          >
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </PermissionProvider>
  );
}
