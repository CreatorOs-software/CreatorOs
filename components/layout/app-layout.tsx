"use client";

import { useState } from "react";
import {
  SidebarProvider,
  Toast,
  ToastClose,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@talentos/ui";
import { AppSidebar } from "./sidebar";
import { Header } from "./header";
import { PageHeaderProvider } from "./page-header-context";
import { PermissionProvider } from "@/components/context/permission-provider";
import { DockProvider } from "./dock-context";
import { AppDock } from "./app-dock";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { Role, PermissionMap } from "@/domains/auth/types";

// Unterhalb dieser Breite bleibt die App-Sidebar immer eingeklappt (Icon-Rail) —
// unabhängig vom manuellen Toggle-Status. Getrennt vom Mobile-Sheet-Breakpoint
// (768px) innerhalb von SidebarProvider selbst.
const SIDEBAR_COLLAPSE_BREAKPOINT = "(max-width: 1399px)";

interface AppLayoutProps {
  children: React.ReactNode;
  fullHeight?: boolean;
  user?: { id: string; name?: string; email?: string; avatarConfig?: import("@/lib/avatar").AvatarConfig | null } | null;
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
  return (
    <div className="flex-1 overflow-hidden p-2 pl-0">
      <div
        className={cn(
          "h-full rounded-2xl bg-surface overflow-hidden p-2  ",
          fullHeight && "flex flex-col",
        )}
      >
        <main
          className={cn(
            "p-4",
            fullHeight ? "flex-1 min-h-0 overflow-hidden" : "",
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
  user,
  role = "member",
  permissions,
}: AppLayoutProps) {
  const defaultPermissions = permissions ?? ({} as PermissionMap);

  const isNarrow = useMediaQuery(SIDEBAR_COLLAPSE_BREAKPOINT);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [blockedToastOpen, setBlockedToastOpen] = useState(false);

  return (
    <PermissionProvider role={role} permissions={defaultPermissions}>
      <PageHeaderProvider>
        <DockProvider>
          <SidebarProvider
            open={isNarrow ? false : sidebarOpen}
            onOpenChange={(next) => {
              if (isNarrow) {
                if (next) setBlockedToastOpen(true);
                return;
              }
              setSidebarOpen(next);
            }}
            className="h-svh overflow-hidden bg-background"
          >
            <AppSidebar />
            <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
              <Header user={user} />
              <DockAwareContent fullHeight={fullHeight}>
                {children}
              </DockAwareContent>
              <AppDock />
            </div>
          </SidebarProvider>
        </DockProvider>
      </PageHeaderProvider>

      <ToastProvider>
        <Toast
          open={blockedToastOpen}
          onOpenChange={setBlockedToastOpen}
          duration={3000}
          variant={"destructive"}
        >
          <ToastTitle>
            Sidebar kann in der aktuellen Bildschirmgröße nicht ausgeklappt
            werden
          </ToastTitle>
          <ToastClose />
        </Toast>
        <ToastViewport />
      </ToastProvider>
    </PermissionProvider>
  );
}
