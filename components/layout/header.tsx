"use client";

import { useAuth } from "@/components/auth/use-auth";
import { usePageHeader } from "./page-header-context";
import { ArrowLeft, Bell, LogOut, PuzzleIcon } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage, Button } from "@talentos/ui";

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

  const initials =
    user?.name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") ?? "";

  return (
    <header className="flex items-center justify-between px-4 py-3 shrink-0 bg-card border-b border-border">
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
        <div />
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Link
          href="/integrations"
          className="flex items-center gap-2 bg-card rounded-full px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          <PuzzleIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Integration</span>
        </Link>

        <Button className="p-2.5 rounded-full bg-card hover:bg-muted transition-colors">
          <Bell className="w-5 h-5" />
        </Button>

        {/* User Menu */}
        {user && (
          <div className="hidden sm:flex items-center gap-2 bg-card rounded-full pl-1 pr-3 py-1">
            <Avatar className="size-8">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="bg-brand/10 text-xs font-bold text-brand">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        )}

        <Button
          onClick={signOut}
          className="p-2.5 rounded-full bg-card hover:bg-destructive/10 hover:text-destructive transition-colors"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
}
