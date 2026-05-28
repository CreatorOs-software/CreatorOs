"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Monitor,
  AppWindow,
  Wallet,
  Calendar,
  Star,
  X,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Inbox", icon: Inbox, href: "/inbox" },
  { label: "Creator", icon: UserPlus, href: "/creators" },
  { label: "Devices", icon: Monitor, href: "/devices" },
  { label: "Apps", icon: AppWindow, href: "/apps" },
  { label: "Salary", icon: Wallet, href: "/salary" },
  { label: "Calendar", icon: Calendar, href: "/calendar" },
  { label: "Reviews", icon: Star, href: "/reviews" },
];

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname();
  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 w-72 bg-card z-50 lg:hidden transition-transform duration-300 flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-light">
          <div className="rounded-lg border border-foreground/20 px-4 py-2">
            <span className="text-lg font-semibold text-foreground">
              Crextio
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted",
                    )}
                    onClick={onClose}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-border-light">
          <div className="bg-accent/50 rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-2">Need help?</p>
            <p className="text-sm font-medium">Contact Support</p>
          </div>
        </div>
      </aside>
    </>
  );
}
