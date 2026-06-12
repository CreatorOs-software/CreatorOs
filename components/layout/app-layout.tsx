"use client";

import { useState } from "react";

import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { MobileSidebar } from "./mobile-sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
  fullHeight?: boolean;
  user?: { id: string; name?: string; email?: string } | null;
}

export function AppLayout({ children, fullHeight = false, user }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div
      className={
        fullHeight ? "h-screen overflow-hidden flex flex-col" : "min-h-screen"
      }
    >
      {/* Header - Full Width */}
      <Header
        onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        isMobileMenuOpen={mobileMenuOpen}
        user={user}
      />

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Desktop Floating Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content */}
      <main
        className={`${fullHeight ? "flex-1 min-h-0 overflow-hidden" : ""} px-6 pb-4 transition-all duration-300 ${
          sidebarOpen ? "lg:ml-64" : "lg:ml-24"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
