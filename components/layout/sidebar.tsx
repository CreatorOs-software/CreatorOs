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
  Inbox,
  Users,
  Settings2,
} from "lucide-react";
import { QueryKeys } from "@/lib/query-keys";
import { usePermissions } from "@/components/context/permission-provider";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

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

export function AppSidebar() {
  const pathname = usePathname();
  const { isAdmin } = usePermissions();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const { data } = useQuery<{
    threads: { unread: boolean; folder: string | null }[];
  }>({
    queryKey: QueryKeys.inbox.all(),
    queryFn: () => fetch("/api/inbox").then((r) => r.json()),
    staleTime: 2 * 60_000,
  });
  const unreadCount = (data?.threads ?? []).filter(
    (t) => t.unread && t.folder !== "sent",
  ).length;

  return (
    <Sidebar collapsible="icon">
      {/* Logo */}
      <SidebarHeader className="p-3">
        <div className="flex items-center h-9">
          {isCollapsed ? (
            <div className="w-8 h-8 rounded-lg border border-foreground/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold">C</span>
            </div>
          ) : (
            <div className="rounded-lg border border-foreground/20 px-3 py-1.5">
              <span className="text-base font-semibold">Crextio</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                const isInbox = item.label === "Inbox";
                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={item.label}
                      className="h-10"
                    >
                      <div className="relative">
                        <Icon />
                        {isCollapsed && isInbox && unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-yellow-400" />
                        )}
                      </div>
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    {!isCollapsed && isInbox && unreadCount > 0 && (
                      <SidebarMenuBadge className="bg-yellow-400 text-black text-[10px] font-semibold rounded-full px-1.5">
                        {unreadCount}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={isActive}
                        tooltip={item.label}
                        className="h-10"
                      >
                        <Icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {!isCollapsed && (
        <SidebarFooter className="p-3">
          <div className="bg-sidebar-accent/50 rounded-xl p-3">
            <p className="text-xs text-sidebar-foreground/60 mb-1">
              Need help?
            </p>
            <p className="text-sm font-medium">Contact Support</p>
          </div>
        </SidebarFooter>
      )}

      <SidebarRail />
    </Sidebar>
  );
}
