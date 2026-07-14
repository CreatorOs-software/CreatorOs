"use client";

import { Header } from "./header";
import { AppSidebar } from "./sidebar";
import { PageHeaderProvider } from "./page-header-context";
import { PermissionProvider } from "@/components/context/permission-provider";
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
  user,
  role = "member",
  permissions,
}: AppLayoutProps) {
  const defaultPermissions = permissions ?? ({} as PermissionMap);

  return (
    <PermissionProvider role={role} permissions={defaultPermissions}>
      <PageHeaderProvider>
        <div className="flex flex-col md:flex-row h-svh w-full overflow-hidden">
          <AppSidebar />
          <div
            className={cn(
              "flex flex-col flex-1 overflow-hidden",
              fullHeight && "h-svh",
            )}
          >
            <Header user={user} />
            <main
              className={cn(
                "px-6 pb-4",
                fullHeight && "flex-1 min-h-0 overflow-hidden",
              )}
            >
              {children}
            </main>
          </div>
        </div>
      </PageHeaderProvider>
    </PermissionProvider>
  );
}
