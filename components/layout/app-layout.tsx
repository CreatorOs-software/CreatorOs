"use client";

import { AppSidebar } from "./sidebar";
import { PageHeaderProvider } from "./page-header-context";
import { PermissionProvider } from "@/components/context/permission-provider";
import { DockProvider, useDock } from "./dock-context";
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

function DockAwareContent({
  children,
  fullHeight,
}: {
  children: React.ReactNode;
  fullHeight: boolean;
}) {
  const { dockVisible } = useDock();

  return (
    <div className="flex-1 overflow-hidden p-2 pl-0">
      <div
        className={cn(
          "h-full rounded-2xl bg-gray-50 overflow-hidden",
          fullHeight && "flex flex-col",
        )}
      >
        <main
          className={cn(
            "px-6 pt-6",
            fullHeight ? "flex-1 min-h-0 overflow-hidden" : "",
            dockVisible ? "pb-16" : "pb-4",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
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
            <DockAwareContent fullHeight={fullHeight}>
              {children}
            </DockAwareContent>
          </div>
          <AppDock />
        </DockProvider>
      </PageHeaderProvider>
    </PermissionProvider>
  );
}
