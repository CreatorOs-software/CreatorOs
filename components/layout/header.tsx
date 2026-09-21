"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "@/components/auth/use-auth";
import { usePageHeader } from "./page-header-context";
import { useDock } from "./dock-context";
import { QueryKeys } from "@/lib/query-keys";
import { ArrowLeft, Bell, LogOut, Mail, Search } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Input,
} from "@talentos/ui";

interface User {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  avatar?: string;
}

interface HeaderProps {
  user?: User | null;
}

export function Header({ user }: HeaderProps) {
  const { signOut } = useAuth();
  const { config } = usePageHeader();
  const { activePanel, setActivePanel } = useDock();

  const { data: notifData } = useQuery<{ unreadCount: number }>({
    queryKey: QueryKeys.notifications.all(),
    queryFn: () => fetch("/api/notifications").then((r) => r.json()),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const unreadCount = notifData?.unreadCount ?? 0;

  const initials =
    user?.name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") ?? "";

  return (
    <div className="px-2 pt-2 pl-0 shrink-0">
      <header className="flex items-center justify-between gap-4 rounded-2xl bg-surface px-4 py-3">
        {config ? (
          <div className="flex items-center gap-2 min-w-0">
            {config.onBack && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={config.onBack}
                className="size-auto shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap leading-tight">
                {config.title}
              </div>
              {config.subtitle && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {config.subtitle}
                </p>
              )}
            </div>
          </div>
        ) : (
          <Input
            type="search"
            placeholder="Suchen..."
            startAdornment={<Search className="w-4 h-4" />}
            wrapperClassName="w-full max-w-xs bg-white"
          />
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/help"
            title="Kontakt"
            className="p-2.5 rounded-full bg-white hover:bg-muted transition-colors"
          >
            <Mail className="w-5 h-5" />
          </Link>

          <button
            type="button"
            onClick={() =>
              setActivePanel(
                activePanel === "benachrichtigungen"
                  ? null
                  : "benachrichtigungen",
              )
            }
            className="relative p-2.5 rounded-full bg-white hover:bg-muted transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </button>

          {/* User Info */}
          {user && (
            <div className="flex items-center gap-2 bg-white rounded-full pl-1 pr-3 py-1 ">
              <Avatar className="size-8">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="bg-brand/10 text-xs font-bold text-brand">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-left leading-tight">
                <span className="block text-sm font-medium">{user.name}</span>
                {user.email && (
                  <span className="block text-xs text-muted-foreground">
                    {user.email}
                  </span>
                )}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={signOut}
            title="Abmelden"
            className="p-2.5 rounded-full bg-white hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>
    </div>
  );
}
