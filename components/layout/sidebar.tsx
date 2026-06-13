"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  File,
  User,
  Calendar,
  Wallet,
  Star,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Users,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QueryKeys } from "@/lib/query-keys";
import { usePermissions } from "@/components/context/permission-provider";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Inbox", icon: Inbox, href: "/inbox" },
  { label: "Deals", icon: File, href: "/deals" },
  { label: "Creator", icon: User, href: "/creators" },
  { label: "Events", icon: Calendar, href: "/events" },
  { label: "Invoice", icon: Wallet, href: "/salary" },
  { label: "Reviews", icon: Star, href: "/reviews" },
];

const adminItems = [
  { label: "Members", icon: Users, href: "/admin/members" },
  { label: "Settings", icon: Settings2, href: "/admin/settings" },
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { isAdmin } = usePermissions();

  const { data } = useQuery<{ threads: { unread: boolean; folder: string | null }[] }>({
    queryKey: QueryKeys.inbox.all(),
    queryFn: () => fetch("/api/inbox").then((r) => r.json()),
    staleTime: 2 * 60_000,
  });
  const unreadCount = (data?.threads ?? []).filter((t) => t.unread && t.folder !== "sent").length;

  function NavItem({ item }: { item: { label: string; icon: React.ElementType; href: string } }) {
    const Icon = item.icon;
    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
    return (
      <li>
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
  }

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col bg-sidebar rounded-2xl fixed left-4 top-20 bottom-4 z-40 transition-all duration-300",
        isOpen ? "w-56" : "w-16",
      )}
    >
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-6 w-6 h-6 bg-card border border-border-light rounded-full flex items-center justify-center hover:bg-muted transition-colors"
      >
        {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {/* Main Navigation */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <NavItem key={item.label} item={item} />
          ))}
        </ul>

        {/* Admin Section */}
        {isAdmin && (
          <>
            <div className={cn("my-3 border-t border-border-light", !isOpen && "mx-2")} />
            {isOpen && (
              <p className="px-4 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Admin
              </p>
            )}
            <ul className="space-y-2">
              {adminItems.map((item) => (
                <NavItem key={item.label} item={item} />
              ))}
            </ul>
          </>
        )}
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
