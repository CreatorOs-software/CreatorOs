"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
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
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { QueryKeys } from "@/lib/query-keys";
import { usePermissions } from "@/components/context/permission-provider";
import { cn } from "@/lib/utils";

const Logo = () => (
  <Link
    href="/dashboard"
    className="font-normal flex items-center gap-2 text-sm py-1 relative z-20"
  >
    <div className="h-5 w-6 bg-foreground rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm shrink-0" />
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="font-semibold text-foreground whitespace-pre"
    >
      Crextio
    </motion.span>
  </Link>
);

const LogoIcon = () => (
  <Link href="/dashboard" className="flex py-1 relative z-20">
    <div className="h-5 w-6 bg-foreground rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm shrink-0" />
  </Link>
);

export function AppSidebar() {
  const pathname = usePathname();
  const { isAdmin } = usePermissions();
  const [open, setOpen] = useState(false);

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

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5 shrink-0 text-sidebar-foreground" />,
    },
    {
      label: "Inbox",
      href: "/inbox",
      icon: (
        <div className="relative">
          <Inbox className="h-5 w-5 shrink-0 text-sidebar-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-yellow-400" />
          )}
        </div>
      ),
    },
    {
      label: "Deals",
      href: "/deals",
      icon: <File className="h-5 w-5 shrink-0 text-sidebar-foreground" />,
    },
    {
      label: "Creator",
      href: "/creators",
      icon: <User className="h-5 w-5 shrink-0 text-sidebar-foreground" />,
    },
    {
      label: "Events",
      href: "/events",
      icon: <Calendar className="h-5 w-5 shrink-0 text-sidebar-foreground" />,
    },
    {
      label: "Invoice",
      href: "/salary",
      icon: <Wallet className="h-5 w-5 shrink-0 text-sidebar-foreground" />,
    },
    {
      label: "Reviews",
      href: "/reviews",
      icon: <Star className="h-5 w-5 shrink-0 text-sidebar-foreground" />,
    },
  ];

  const adminItems = [
    {
      label: "Members",
      href: "/admin/members",
      icon: <Users className="h-5 w-5 shrink-0 text-sidebar-foreground" />,
    },
    {
      label: "Settings",
      href: "/admin/settings",
      icon: <Settings2 className="h-5 w-5 shrink-0 text-sidebar-foreground" />,
    },
  ];

  return (
    <Sidebar open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between gap-10">
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          {open ? <Logo /> : <LogoIcon />}
          <div className="mt-8 flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <SidebarLink
                  key={item.label}
                  link={item}
                  className={cn(
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "hover:bg-sidebar-accent/50",
                  )}
                />
              );
            })}
          </div>

          {isAdmin && (
            <div className="mt-6 flex flex-col gap-1">
              <motion.span
                animate={{
                  display: open ? "block" : "none",
                  opacity: open ? 1 : 0,
                }}
                className="px-2 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider mb-1"
              >
                Admin
              </motion.span>
              {adminItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <SidebarLink
                    key={item.label}
                    link={item}
                    className={cn(
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "hover:bg-sidebar-accent/50",
                    )}
                  />
                );
              })}
            </div>
          )}
        </div>
      </SidebarBody>
    </Sidebar>
  );
}
