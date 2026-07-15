"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Avatar } from "@base-ui/react";
import {
  LayoutDashboard,
  Building2,
  User,
  Calendar,
  Wallet,
  Star,
  Inbox,
  Users,
  Settings2,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarBody,
  SidebarLink,
  useSidebar,
} from "@/components/ui/sidebar";
import { QueryKeys } from "@/lib/query-keys";
import { usePermissions } from "@/components/context/permission-provider";
import { useAuth } from "@/components/auth/use-auth";
import { cn } from "@/lib/utils";

const Logo = () => (
  <Link
    href="/dashboard"
    className="font-normal flex items-center gap-2 text-sm py-1 relative z-20"
  >
    <div className="h-5 w-6 bg-sidebar-accent rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm shrink-0" />
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
  <Link href="/dashboard" className="flex justify-center py-1 relative z-20">
    <div className="h-5 w-6 bg-sidebar-accent rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm shrink-0" />
  </Link>
);

function ProfileSection() {
  const { user, signOut } = useAuth();
  const { open, animate } = useSidebar();

  const name =
    (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "";
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className={cn("flex items-center py-2 rounded-md", open ? "gap-2 px-2" : "justify-center")}>
      <Avatar.Root className="w-7 h-7 rounded-full overflow-hidden shrink-0">
        <Avatar.Image
          src={user?.user_metadata?.avatar_url as string | undefined}
          alt={name}
          className="w-full h-full object-cover"
        />
        <Avatar.Fallback className="w-full h-full rounded-full bg-yellow-400 flex items-center justify-center text-xs font-bold text-black">
          {initials}
        </Avatar.Fallback>
      </Avatar.Root>
      <motion.div
        animate={{
          display: animate ? (open ? "flex" : "none") : "flex",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="flex items-center justify-between flex-1 min-w-0"
      >
        <p className="text-sm font-medium text-sidebar-foreground truncate min-w-0">
          {name}
        </p>
        <button
          onClick={signOut}
          className="ml-2 p-1 rounded-md hover:bg-sidebar-accent transition-colors shrink-0"
          title="Abmelden"
        >
          <LogOut className="w-4 h-4 text-current" />
        </button>
      </motion.div>
    </div>
  );
}

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
      icon: <LayoutDashboard className="h-5 w-5 shrink-0 text-current" />,
    },
    {
      label: "Inbox",
      href: "/inbox",
      icon: (
        <div className="relative">
          <Inbox className="h-5 w-5 shrink-0 text-current" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
          )}
        </div>
      ),
    },
    {
      label: "Brands",
      href: "/brands",
      icon: <Building2 className="h-5 w-5 shrink-0 text-current" />,
    },
    {
      label: "Creator",
      href: "/creators",
      icon: <User className="h-5 w-5 shrink-0 text-current" />,
    },
    {
      label: "Events",
      href: "/events",
      icon: <Calendar className="h-5 w-5 shrink-0 text-current" />,
    },
    {
      label: "Invoice",
      href: "/salary",
      icon: <Wallet className="h-5 w-5 shrink-0 text-current" />,
    },
    {
      label: "Reviews",
      href: "/reviews",
      icon: <Star className="h-5 w-5 shrink-0 text-current" />,
    },
  ];

  const adminItems = [
    {
      label: "Members",
      href: "/admin/members",
      icon: <Users className="h-5 w-5 shrink-0 text-current" />,
    },
    {
      label: "Settings",
      href: "/admin/settings",
      icon: <Settings2 className="h-5 w-5 shrink-0 text-current" />,
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
                      ? "bg-sidebar-accent text-white"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50",
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

        <ProfileSection />
      </SidebarBody>
    </Sidebar>
  );
}
