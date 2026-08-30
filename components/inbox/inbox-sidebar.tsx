"use client";

import {
  Archive,
  Check,
  ChevronDown,
  Columns2,
  Inbox,
  Mail,
  MessageSquare,
  PanelLeft,
  Pencil,
  Plus,
  Send,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Creator, Folder, Integration } from "./types";
import type { EmailLabel } from "@/domains/communication";
import { AddMailboxDialog } from "./add-mailbox-dialog";

// ─── Label colors ─────────────────────────────────────────────────────────────

const LABEL_COLORS = [
  "#006FFE", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16",
];

// ─── CreateLabelDialog ────────────────────────────────────────────────────────

function CreateLabelDialog({ onAdd }: { onAdd: (name: string, color: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(LABEL_COLORS[0]!);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onAdd(name.trim(), color);
      setName("");
      setColor(LABEL_COLORS[0]!);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-4 w-4 items-center justify-center rounded text-muted-foreground hover:text-foreground"
      >
        <Plus className="h-3 w-3" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Neues Label</DialogTitle>
          </DialogHeader>
          <div className="mt-2 flex flex-col gap-4">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleSubmit()}
              placeholder="Label-Name"
              className="h-9 w-full rounded-lg bg-muted px-3 text-sm outline-none focus:ring-1 focus:ring-foreground/20"
            />
            <div>
              <p className="mb-2 text-xs text-muted-foreground">Farbe</p>
              <div className="flex flex-wrap gap-2">
                {LABEL_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn(
                      "h-6 w-6 rounded-full border-2 transition-transform",
                      color === c ? "scale-110 border-foreground" : "border-transparent",
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Abbrechen
              </button>
              <button
                onClick={() => void handleSubmit()}
                disabled={!name.trim() || saving}
                className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background disabled:opacity-40"
              >
                Erstellen
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── LabelsSection ────────────────────────────────────────────────────────────

function LabelsSection({
  labels,
  activeLabelId,
  onLabelClick,
  onCreateLabel,
  onDeleteLabel,
}: {
  labels: EmailLabel[];
  activeLabelId: string | null;
  onLabelClick: (id: string) => void;
  onCreateLabel: (name: string, color: string) => Promise<void>;
  onDeleteLabel: (id: string) => Promise<void>;
}) {
  return (
    <section>
      <div className="mb-1.5 flex items-center justify-between px-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
          Labels
        </p>
        <CreateLabelDialog onAdd={onCreateLabel} />
      </div>
      {labels.length === 0 ? (
        <p className="px-2 text-[11px] text-muted-foreground/50">Noch keine Labels</p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {labels.map((label) => {
            const isActive = activeLabelId === label.id;
            return (
              <button
                key={label.id}
                onClick={() => onLabelClick(label.id)}
                className={cn(
                  "group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
                  isActive ? "bg-muted" : "hover:bg-muted/60",
                )}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: label.color }}
                />
                <span className={cn("flex-1 truncate text-[13px]", isActive ? "font-medium text-foreground" : "text-muted-foreground")}>
                  {label.name}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); void onDeleteLabel(label.id); }}
                  className="hidden rounded text-muted-foreground hover:text-foreground group-hover:block"
                >
                  <X className="h-3 w-3" />
                </button>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

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
        <span className="px-1 text-xs font-medium text-brand">{badge}</span>
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
        "flex shrink-0 items-center justify-center rounded-lg bg-zinc-100 font-bold text-zinc-500",
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
  creators: Creator[];
  onSelect: (id: string) => void;
};

function AccountSwitcher({ integrations, selectedId, creators, onSelect }: AccountSwitcherProps) {
  const selected = integrations.find((i) => i.id === selectedId) ?? integrations[0];
  const creatorName = (integ: Integration) =>
    integ.creator_id ? (creators.find((c) => c.id === integ.creator_id)?.full_name ?? null) : null;

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
                {creatorName(selected) ?? selected.display_name ?? selected.email}
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
                  {creatorName(integ) ?? integ.display_name ?? integ.email}
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
  creators: Creator[];
  labels: EmailLabel[];
  activeLabelId: string | null;
  onFolderChange: (f: Folder) => void;
  onIntegrationChange: (id: string) => void;
  onCompose: () => void;
  onLabelClick: (id: string) => void;
  onCreateLabel: (name: string, color: string) => Promise<void>;
  onDeleteLabel: (id: string) => Promise<void>;
  merged?: boolean;
  onMergedChange?: (v: boolean) => void;
};

export function InboxSidebar({
  folder,
  unreadCount,
  integrations,
  selectedIntegrationId,
  creators,
  labels,
  activeLabelId,
  onFolderChange,
  onIntegrationChange,
  onCompose,
  onLabelClick,
  onCreateLabel,
  onDeleteLabel,
  merged = false,
  onMergedChange,
}: InboxSidebarProps) {
  return (
    <div className={cn("flex h-full select-none flex-col overflow-hidden bg-white py-3", merged ? "w-full" : "w-52 shrink-0 border-r border-[#E7E7E7]")}>
      {/* Account row */}
      <div className="flex items-center gap-1 px-2 pb-3">
        <AccountSwitcher
          integrations={integrations}
          selectedId={selectedIntegrationId}
          creators={creators}
          onSelect={onIntegrationChange}
        />
        <AddMailboxDialog />
      </div>

      {/* Compose */}
      <div className="px-3 pb-3">
        <button
          onClick={onCompose}
          className="inline-flex h-8 w-full items-center justify-center gap-2 rounded-lg border border-[#E7E7E7] bg-transparent text-sm text-foreground transition-colors hover:bg-muted/50"
        >
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

        <LabelsSection
          labels={labels}
          activeLabelId={activeLabelId}
          onLabelClick={onLabelClick}
          onCreateLabel={onCreateLabel}
          onDeleteLabel={onDeleteLabel}
        />
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
        {onMergedChange && (
          <button
            onClick={() => onMergedChange(!merged)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] transition-colors",
              merged
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            {merged ? (
              <Columns2 className="h-4 w-4 shrink-0" />
            ) : (
              <PanelLeft className="h-4 w-4 shrink-0" />
            )}
            {merged ? "Panels trennen" : "Panels zusammenführen"}
          </button>
        )}
      </div>
    </div>
  );
}
