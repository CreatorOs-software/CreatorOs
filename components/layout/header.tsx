"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "@/components/auth/use-auth";
import { QueryKeys } from "@/lib/query-keys";
import { Bell, LogOut, Mail, Search } from "lucide-react";
import {
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@talentos/ui";
import { NotificationsPanel } from "@/components/notifications/notifications-panel";
import { AvatarDisplay } from "@/components/ui/avatar-display";
import type { AvatarConfig } from "@/lib/avatar";

interface User {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  avatarConfig?: AvatarConfig | null;
}

interface HeaderProps {
  user?: User | null;
}

export function Header({ user }: HeaderProps) {
  const { signOut } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const { data: notifData } = useQuery<{ unreadCount: number }>({
    queryKey: QueryKeys.notifications.all(),
    queryFn: () => fetch("/api/notifications").then((r) => r.json()),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const unreadCount = notifData?.unreadCount ?? 0;

  return (
    <div className="px-2 pt-2 pl-0 shrink-0">
      <header className="flex items-center justify-between gap-4 rounded-2xl bg-surface px-4 py-3">
        <Input
          type="search"
          placeholder="Suchen..."
          startAdornment={<Search className="w-4 h-4" />}
          wrapperClassName="w-full max-w-xs bg-white"
        />

        {/* Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/help"
            title="Kontakt"
            className="p-2.5 rounded-full bg-white hover:bg-muted transition-colors"
          >
            <Mail className="w-5 h-5" />
          </Link>

          <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Benachrichtigungen öffnen"
                className="relative rounded-full bg-white p-2.5 transition-colors hover:bg-muted"
              >
                <Bell className="size-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-red-500 ring-2 ring-white" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={8}
              className="w-auto! overflow-hidden rounded-2xl! border-border/70! p-0! shadow-xl!"
            >
              <NotificationsPanel onNavigate={() => setNotificationsOpen(false)} />
            </PopoverContent>
          </Popover>

          {/* User Info */}
          {user && (
            <div className="flex items-center gap-2 bg-white rounded-full pl-1 pr-3 py-1 ">
              <AvatarDisplay config={user.avatarConfig} seed={user.id} name={user.name} size="sm" />
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
