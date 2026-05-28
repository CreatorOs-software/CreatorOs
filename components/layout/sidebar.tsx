"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UserPlus,
  Monitor,
  AppWindow,
  Wallet,
  Calendar,
  Star,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clientCache } from "@/lib/client-cache";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Inbox", icon: Inbox, href: "/inbox" },
  { label: "Deals", icon: UserPlus, href: "/deals" },
  { label: "Creator", icon: Monitor, href: "/creators" },
  { label: "Events", icon: AppWindow, href: "/events" },
  { label: "Salary", icon: Wallet, href: "/salary" },
  { label: "Calendar", icon: Calendar, href: "/calendar" },
  { label: "Reviews", icon: Star, href: "/reviews" },
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(
    () => clientCache.get<number>("inbox:unread") ?? 0,
  );

  useEffect(() => {
    if (clientCache.get<number>("inbox:unread") !== null) return;
    fetch("/api/inbox")
      .then((r) => r.json())
      .then((json) => {
        const threads: { unread: boolean; folder: string | null }[] =
          json.threads ?? [];
        const count = threads.filter(
          (t) => t.unread && t.folder !== "sent",
        ).length;
        clientCache.set("inbox:unread", count, 2 * 60_000);
        setUnreadCount(count);
      })
      .catch(() => {});
  }, [pathname]);
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
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
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
                  <div className="relative">
                    <Icon className="w-5 h-5 shrink-0" />
                    {!isOpen && item.label === "Inbox" && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-yellow-400" />
                    )}
                  </div>
                  {isOpen && <span className="flex-1">{item.label}</span>}
                  {isOpen && item.label === "Inbox" && unreadCount > 0 && (
                    <span className="text-[10px] bg-yellow-400 text-black rounded-full px-1.5 py-0.5 leading-none font-semibold">
                      {unreadCount}
                    </span>
                  )}
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
