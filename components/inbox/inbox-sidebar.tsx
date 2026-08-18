"use client";

import {
  Archive,
  Check,
  ChevronDown,
  Inbox,
  Mail,
  MessageSquare,
  Pencil,
  Send,
  Settings2,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Folder, Integration } from "./types";
import { AddMailboxDialog } from "./add-mailbox-dialog";

// ─── Nav config ───────────────────────────────────────────────────────────────

type NavEntry = { id: Folder; label: string; icon: ReactNode };

const FOLDER_NAV: NavEntry[] = [
  { id: "inbox", label: "Inbox", icon: <Inbox className="h-4 w-4 shrink-0" /> },
  { id: "drafts", label: "Drafts", icon: <Pencil className="h-4 w-4 shrink-0" /> },
  { id: "sent", label: "Sent", icon: <Send className="h-4 w-4 shrink-0" /> },
];

const MANAGEMENT_NAV: NavEntry[] = [
  { id: "archive", label: "Archive", icon: <Archive className="h-4 w-4 shrink-0" /> },
  { id: "spam", label: "Spam", icon: <Mail className="h-4 w-4 shrink-0" /> },
  { id: "bin", label: "Bin", icon: <Trash2 className="h-4 w-4 shrink-0" /> },
];

// ─── NavItem ──────────────────────────────────────────────────────────────────

type NavItemProps = NavEntry & {
  activeFolder: Folder;
  badge?: number;
  onFolderChange: (f: Folder) => void;
};

function NavItem({ id, label, icon, badge, activeFolder, onFolderChange }: NavItemProps) {
  const isActive = activeFolder === id;
  return (
    <button
      onClick={() => onFolderChange(id)}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors",
        isActive
          ? "bg-muted font-medium text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {icon}
      <span className="flex-1 truncate">{label}</span>
      {badge != null && badge > 0 && (
        <span className="px-1 text-xs font-medium text-[#006FFE]">{badge}</span>
      )}
    </button>
  );
}

// ─── IntegrationAvatar ────────────────────────────────────────────────────────

function IntegrationAvatar({
  integration,
  size = "md",
}: {
  integration: Integration;
  size?: "sm" | "md";
}) {
  const label = (integration.display_name ?? integration.email).slice(0, 1).toUpperCase();
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-[#006FFE] font-bold text-white",
        size === "sm" ? "h-6 w-6 text-[10px]" : "h-7 w-7 text-[11px]",
      )}
    >
      {label}
    </div>
  );
}

// ─── AccountSwitcher ──────────────────────────────────────────────────────────

type AccountSwitcherProps = {
  integrations: Integration[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

function AccountSwitcher({ integrations, selectedId, onSelect }: AccountSwitcherProps) {
  const selected = integrations.find((i) => i.id === selectedId) ?? integrations[0];

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-left transition-colors hover:bg-muted/60",
          "border-0 bg-transparent",
        )}
      >
        {selected ? (
          <>
            <IntegrationAvatar integration={selected} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium leading-none text-foreground">
                {selected.display_name ?? selected.email}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {selected.email}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-[10px] font-bold text-muted-foreground">
              ?
            </div>
            <p className="truncate text-[13px] text-muted-foreground">Kein Postfach</p>
          </>
        )}
        {integrations.length > 0 && (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
      </PopoverTrigger>

      {integrations.length > 0 && (
        <PopoverContent
          side="bottom"
          align="start"
          className="w-56 p-1"
          sideOffset={6}
        >
          {integrations.map((integ) => (
            <button
              key={integ.id}
              onClick={() => onSelect(integ.id)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted"
            >
              <IntegrationAvatar integration={integ} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium leading-none text-foreground">
                  {integ.display_name ?? integ.email}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {integ.email}
                </p>
              </div>
              {integ.id === selectedId && (
                <Check className="h-3.5 w-3.5 shrink-0 text-foreground" />
              )}
            </button>
          ))}
        </PopoverContent>
      )}
    </Popover>
  );
}

// ─── InboxSidebar ─────────────────────────────────────────────────────────────

type InboxSidebarProps = {
  folder: Folder;
  unreadCount: number;
  integrations: Integration[];
  selectedIntegrationId: string | null;
  onFolderChange: (f: Folder) => void;
  onIntegrationChange: (id: string) => void;
};

export function InboxSidebar({
  folder,
  unreadCount,
  integrations,
  selectedIntegrationId,
  onFolderChange,
  onIntegrationChange,
}: InboxSidebarProps) {
  return (
    <div className="flex h-full w-52 shrink-0 select-none flex-col overflow-hidden rounded-2xl border border-[#E7E7E7] bg-white py-3 shadow-sm">
      {/* Account row */}
      <div className="flex items-center gap-1 px-2 pb-3">
        <AccountSwitcher
          integrations={integrations}
          selectedId={selectedIntegrationId}
          onSelect={onIntegrationChange}
        />
        <AddMailboxDialog />
      </div>

      {/* Compose */}
      <div className="px-3 pb-3">
        <button className="inline-flex h-8 w-full items-center justify-center gap-2 rounded-lg border border-[#E7E7E7] bg-transparent text-sm text-foreground transition-colors hover:bg-muted/50">
          <Pencil className="h-3.5 w-3.5" />
          New Email
        </button>
      </div>

      {/* Scrollable nav */}
      <div className="flex-1 space-y-4 overflow-y-auto px-3">
        <section>
          <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
            Core
          </p>
          <div className="space-y-0.5">
            {FOLDER_NAV.map((item) => (
              <NavItem
                key={item.id}
                {...item}
                activeFolder={folder}
                onFolderChange={onFolderChange}
                badge={item.id === "inbox" ? unreadCount : undefined}
              />
            ))}
          </div>
        </section>

        <section>
          <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
            Management
          </p>
          <div className="space-y-0.5">
            {MANAGEMENT_NAV.map((item) => (
              <NavItem
                key={item.id}
                {...item}
                activeFolder={folder}
                onFolderChange={onFolderChange}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="space-y-0.5 border-t border-[#E7E7E7] px-3 pt-3">
        <button className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground">
          <MessageSquare className="h-4 w-4 shrink-0" />
          Feedback
        </button>
        <button className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground">
          <Settings2 className="h-4 w-4 shrink-0" />
          Settings
        </button>
      </div>
    </div>
  );
}
