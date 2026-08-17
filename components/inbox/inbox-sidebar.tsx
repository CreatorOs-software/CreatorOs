"use client";

import {
  Archive,
  Inbox,
  Mail,
  MessageSquare,
  Pencil,
  Plus,
  Send,
  Settings2,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Folder } from "./types";
import { DEMO_LABELS, GOOGLE_PATHS, TAG_COLORS } from "./constants";

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

// ─── AddMailboxDialog ─────────────────────────────────────────────────────────

export function AddMailboxDialog() {
  return (
    <Dialog>
      <DialogTrigger className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border bg-transparent text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground">
        <Plus className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Konto verbinden</DialogTitle>
          <DialogDescription>
            Verbinde dein E-Mail Postfach mit Crextio um deine Nachrichten hier zu verwalten.
          </DialogDescription>
        </DialogHeader>
        <motion.div
          className="mt-2 grid grid-cols-2 gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.25 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-xl border border-border bg-white transition-colors hover:bg-muted/50"
          >
            <svg viewBox="0 0 24 24" className="h-9 w-9">
              {GOOGLE_PATHS.map((p) => (
                <path key={p.fill} d={p.d} fill={p.fill} />
              ))}
            </svg>
            <span className="text-xs font-medium text-foreground">Google</span>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.25 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            disabled
            className="flex h-24 w-full cursor-not-allowed flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-transparent text-muted-foreground opacity-60"
          >
            <Plus className="h-6 w-6" />
            <span className="text-xs">Weitere folgen</span>
          </motion.button>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

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

// ─── InboxSidebar ─────────────────────────────────────────────────────────────

type InboxSidebarProps = {
  folder: Folder;
  unreadCount: number;
  onFolderChange: (f: Folder) => void;
};

export function InboxSidebar({ folder, unreadCount, onFolderChange }: InboxSidebarProps) {
  return (
    <div className="flex h-full w-52 shrink-0 select-none flex-col overflow-hidden rounded-2xl border border-[#E7E7E7] bg-white py-3 shadow-sm">
      {/* Account row */}
      <div className="flex items-center gap-2 px-3 pb-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#006FFE] text-[10px] font-bold text-white">
          T
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-0.5 truncate text-[13px] font-medium leading-none text-foreground">
            Template User
          </p>
          <p className="truncate text-[11px] text-muted-foreground">template@orbit.email</p>
        </div>
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

        <section>
          <div className="mb-2 flex items-center justify-between px-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Labels
            </p>
            <button className="flex h-4 w-4 items-center justify-center text-muted-foreground transition-colors hover:text-foreground">
              <Plus className="h-3 w-3" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 px-2">
            {DEMO_LABELS.map((label) => (
              <span
                key={label.id}
                className={cn(
                  "cursor-pointer rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
                  TAG_COLORS[label.id] ?? "border border-border bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {label.name}
              </span>
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
