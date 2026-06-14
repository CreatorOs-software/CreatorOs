"use client";

import { useAuth } from "@/components/auth/use-auth";
import { Avatar } from "@base-ui/react";
import { Settings, Bell, Menu, X, LogOut, PuzzleIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface User {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  avatar?: string;
}

interface HeaderProps {
  onMobileMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
  user?: User | null;
}

export function Header({
  onMobileMenuToggle,
  isMobileMenuOpen,
  user,
}: HeaderProps) {
  const { signOut } = useAuth();
  const pathName = usePathname();

  const initials =
    user?.name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") ?? "";

  return (
    <header className="flex items-center justify-between px-6 py-4">
      {/* Logo */}
      <div className="flex items-center gap-4">
        <div className="rounded-lg border border-foreground/20 px-4 py-2">
          <span className="text-lg font-semibold text-foreground">Crextio</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Link
          href="/integrations"
          className="flex items-center gap-2 bg-card rounded-full px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          <PuzzleIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Integration</span>
        </Link>

        <button className="p-2.5 rounded-full bg-card hover:bg-muted transition-colors">
          <Bell className="w-5 h-5" />
        </button>

        {/* User Menu */}
        {user && (
          <div className="hidden sm:flex items-center gap-2 bg-card rounded-full pl-1 pr-3 py-1">
            <Avatar.Root className="w-8 h-8 rounded-full overflow-hidden">
              <Avatar.Image
                src={user.avatar}
                alt={user.name}
                className="w-full h-full object-cover"
              />
              <Avatar.Fallback className="w-full h-full rounded-full bg-yellow-400 flex items-center justify-center text-xs font-bold text-black">
                {initials}
              </Avatar.Fallback>
            </Avatar.Root>
            <span className="text-sm font-medium">{user.name}</span>
          </div>
        )}

        <button
          onClick={signOut}
          className="p-2.5 rounded-full bg-card hover:bg-destructive/10 hover:text-destructive transition-colors"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>

        {/* Mobile Menu Button */}
        <button
          className="lg:hidden p-2.5 rounded-full bg-card shadow-sm hover:bg-muted transition-colors border border-border-light"
          onClick={onMobileMenuToggle}
        >
          {isMobileMenuOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
      </div>
    </header>
  );
}
