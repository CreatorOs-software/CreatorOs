"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Monitor,
  AppWindow,
  Wallet,
  Calendar,
  Star,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Inbox", icon: Users, href: "/inbox" },
  { label: "Hiring", icon: UserPlus, href: "/hiring" },
  { label: "Devices", icon: Monitor, href: "/devices" },
  { label: "Apps", icon: AppWindow, href: "/apps" },
  { label: "Salary", icon: Wallet, href: "/salary" },
  { label: "Calendar", icon: Calendar, href: "/calendar" },
  { label: "Reviews", icon: Star, href: "/reviews" },
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  activeNav?: string;
}

export function Sidebar({
  isOpen,
  onToggle,
  activeNav = "Dashboard",
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col bg-sidebar rounded-2xl  fixed left-4 top-20 bottom-4 z-40 transition-all duration-300",
        isOpen ? "w-56" : "w-16",
      )}
    >
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-6 w-6 h-6 bg-card border border-border-light rounded-full flex items-center justify-center  hover:bg-muted transition-colors"
      >
        {isOpen ? (
          <ChevronLeft className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.label === activeNav;
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-colors",
                    isOpen ? "px-4 py-3" : "px-0 py-3 justify-center",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                  title={!isOpen ? item.label : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {isOpen && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Section */}
      {isOpen && (
        <div className="p-3 border-t border-border-light">
          <div className="bg-accent/50 rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-1">Need help?</p>
            <p className="text-sm font-medium">Contact Support</p>
          </div>
        </div>
      )}
    </aside>
  );
}
