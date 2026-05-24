"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { MobileSidebar } from "./mobile-sidebar";
import { useAuth } from "@/features/auth/hooks/use-auth";

interface AppLayoutProps {
  children: React.ReactNode;
  activeNav?: string;
  fullHeight?: boolean;
}

export function AppLayout({ children, activeNav, fullHeight = false }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className={fullHeight ? "h-screen overflow-hidden flex flex-col" : "min-h-screen"}>
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
        activeNav={activeNav}
      />

      {/* Desktop Floating Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        activeNav={activeNav}
      />

      {/* Main Content */}
      <main
        className={`${fullHeight ? "flex-1 min-h-0 overflow-hidden" : ""} px-6 py-6 transition-all duration-300 ${
          sidebarOpen ? "lg:ml-64" : "lg:ml-24"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
