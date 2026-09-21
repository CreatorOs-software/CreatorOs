"use client";

import Link from "next/link";
import Image from "next/image";
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
  PanelBottom,
  PanelBottomClose,
  FolderOpen,
} from "lucide-react";
import {
  Button,
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
} from "@talentos/ui";
import { QueryKeys } from "@/lib/query-keys";
import { usePermissions } from "@/components/context/permission-provider";
import { useDock } from "@/components/layout/dock-context";
import { RibbonGradient } from "@/components/ui/ribbon-gradient";

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

function MobileAppCard() {
  return (
    <div className="relative isolate mx-2 group-data-[collapsible=icon]:hidden overflow-hidden rounded-lg p-4 text-white">
      <RibbonGradient className="absolute inset-0 -z-10" />
      <div className="mb-3 w-28">
        <Image
          src="/logos/svg/prodigy-one-logo-on-petrol.svg"
          alt="Prodigy One"
          width={289.11}
          height={64}
          className="h-auto w-full object-contain"
        />
      </div>
      <p className="text-sm font-semibold leading-snug">
        Download our
        <br />
        Mobile App
      </p>
      <p className="mt-1 text-xs text-white/60">Get easy in another way</p>
      <Button
        type="button"
        disabled
        className="mt-4 h-auto w-full rounded-full bg-white/15 py-2 text-xs font-medium text-white opacity-100 hover:bg-white/15"
      >
        Coming Soon
      </Button>
    </div>
  );
}

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
            <Image
              src="/logos/svg/prodigy-one-logo-primary.svg"
              alt="Prodigy One"
              width={289.11}
              height={64}
              className="h-8 w-auto"
            />
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
        </SidebarMenu>
        <MobileAppCard />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
