"use client";

import { AppSidebar } from "./sidebar";
import { PageHeaderProvider } from "./page-header-context";
import { PermissionProvider } from "@/components/context/permission-provider";
import { DockProvider } from "./dock-context";
import { AppDock } from "./app-dock";
import { cn } from "@/lib/utils";
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
  role = "member",
  permissions,
}: AppLayoutProps) {
  const defaultPermissions = permissions ?? ({} as PermissionMap);

  return (
    <PermissionProvider role={role} permissions={defaultPermissions}>
      <PageHeaderProvider>
        <DockProvider>
          <div className="flex flex-col md:flex-row h-svh w-full overflow-hidden bg-background">
            <AppSidebar />
            <div className="flex-1 overflow-hidden p-2 pl-0">
              <div
                className={cn(
                  "h-full rounded-2xl bg-gray-50 overflow-hidden",
                  fullHeight && "flex flex-col",
                )}
              >
                <main
                  className={cn(
                    "px-6 pt-6 pb-4",
                    fullHeight && "flex-1 min-h-0 overflow-hidden",
                  )}
                >
                  {children}
                </main>
              </div>
            </div>
          </div>
          <AppDock />
        </DockProvider>
      </PageHeaderProvider>
    </PermissionProvider>
  );
}
