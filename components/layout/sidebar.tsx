"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Building2,
  User,
  Calendar,
  Inbox,
  Users,
  Settings2,
  LogOut,
  PanelBottom,
  PanelBottomClose,
  FolderOpen,
} from "lucide-react";
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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@talentos/ui";
import { QueryKeys } from "@/lib/query-keys";
import { usePermissions } from "@/components/context/permission-provider";
import { useAuth } from "@/components/auth/use-auth";
import { useDock } from "@/components/layout/dock-context";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "Brands", href: "/brands", icon: Building2 },
  { label: "Creator", href: "/creators", icon: User },
  { label: "Events", href: "/events", icon: Calendar },
  { label: "Files", href: "/files", icon: FolderOpen },
  { label: "Settings", href: "/settings", icon: Settings2 },
];

const adminItems = [
  { label: "Members", href: "/admin/members", icon: Users },
  { label: "Settings", href: "/admin/settings", icon: Settings2 },
];

function DockToggleMenuItem() {
  const { dockVisible, toggleDock } = useDock();
  const label = dockVisible ? "Dock schließen" : "Dock öffnen";

  return (
    <SidebarMenuItem>
      <SidebarMenuButton onClick={toggleDock} tooltip={label}>
        {dockVisible ? <PanelBottomClose /> : <PanelBottom />}
        <span className="group-data-[collapsible=icon]:hidden">{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function ProfileMenuItems() {
  const { user, signOut } = useAuth();

  const name =
    (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "";
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton onClick={signOut} tooltip="Abmelden">
          <LogOut />
          <span className="group-data-[collapsible=icon]:hidden">Abmelden</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild tooltip={name}>
          <div>
            <Avatar className="size-7">
              <AvatarImage
                src={user?.user_metadata?.avatar_url as string | undefined}
                alt={name}
              />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="flex-1 truncate">{name}</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { isAdmin } = usePermissions();

  const { data } = useQuery<{ count: number }>({
    queryKey: QueryKeys.inbox.unreadCount(),
    queryFn: () => fetch("/api/inbox/unread-count").then((r) => r.json()),
    staleTime: 60_000,
  });
  const unreadCount = data?.count ?? 0;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-2 py-1 text-sm font-semibold text-foreground group-data-[collapsible=icon]:hidden"
          >
            <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-sidebar-accent" />
            <span>Crextio</span>
          </Link>
          <SidebarTrigger />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <item.icon
                          strokeWidth={active ? 2.5 : 2}
                          className={active ? "text-primary" : undefined}
                        />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.href === "/inbox" && unreadCount > 0 && (
                      <SidebarMenuBadge>{unreadCount}</SidebarMenuBadge>
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
                  const active = isActive(item.href);
                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.label}
                      >
                        <Link href={item.href}>
                          <item.icon
                            strokeWidth={active ? 2.5 : 2}
                            className={active ? "text-primary" : undefined}
                          />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <DockToggleMenuItem />
          <ProfileMenuItems />
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
