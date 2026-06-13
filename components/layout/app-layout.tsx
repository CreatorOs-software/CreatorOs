"use client";

import { useState } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { MobileSidebar } from "./mobile-sidebar";
import { PermissionProvider } from "@/components/context/permission-provider";
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const defaultPermissions = permissions ?? ({} as PermissionMap);

  return (
    <PermissionProvider role={role} permissions={defaultPermissions}>
      <div
        className={
          fullHeight ? "h-screen overflow-hidden flex flex-col" : "min-h-screen"
        }
      >
        <Header
          onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          isMobileMenuOpen={mobileMenuOpen}
          user={user}
        />

        <MobileSidebar
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main
          className={`${fullHeight ? "flex-1 min-h-0 overflow-hidden" : ""} px-6 pb-4 transition-all duration-300 ${
            sidebarOpen ? "lg:ml-64" : "lg:ml-24"
          }`}
        >
          {children}
        </main>
      </div>
    </PermissionProvider>
  );
}
