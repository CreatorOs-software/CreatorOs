"use client";

import {
  Archive,
  Check,
  ChevronDown,
  Inbox,
  Mail,
  Pencil,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@talentos/ui";
import { cn } from "@/lib/utils";
import type { Creator, Folder, Integration } from "./types";
import type { EmailLabel } from "@/domains/communication";
import { AddMailboxDialog } from "./add-mailbox-dialog";

// ─── Label colors ─────────────────────────────────────────────────────────────

const LABEL_COLORS = [
  "#006FFE",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
  "#6366F1",
  "#84CC16",
];

// ─── CreateLabelDialog ────────────────────────────────────────────────────────

function CreateLabelDialog({
  onAdd,
}: {
  onAdd: (name: string, color: string) => Promise<void>;
}) {
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
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="h-4 w-4 rounded text-muted-foreground hover:text-foreground hover:bg-transparent"
      >
        <Plus className="h-3 w-3" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xs" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Neues Label</DialogTitle>
          </DialogHeader>
          <div className="mt-2 flex flex-col gap-4">
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleSubmit()}
              placeholder="Label-Name"
            />
            <div>
              <p className="mb-2 text-xs text-muted-foreground">Farbe</p>
              <div className="flex flex-wrap gap-2">
                {LABEL_COLORS.map((c) => (
                  <Button
                    key={c}
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setColor(c)}
                    className={cn(
                      "h-6 w-6 rounded-full border-2 transition-transform hover:bg-transparent",
                      color === c
                        ? "scale-110 border-foreground"
                        : "border-transparent",
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                className="h-auto rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-transparent"
              >
                Abbrechen
              </Button>
              <Button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={!name.trim() || saving}
                className="h-auto rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:bg-foreground/90"
              >
                Erstellen
              </Button>
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
        <p className="px-2 text-[11px] text-muted-foreground/50">
          Noch keine Labels
        </p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {labels.map((label) => {
            const isActive = activeLabelId === label.id;
            return (
              <div
                key={label.id}
                className={cn(
                  "group flex w-full items-center rounded-lg",
                  isActive ? "bg-muted" : "hover:bg-muted/60",
                )}
              >
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onLabelClick(label.id)}
                  className="h-auto min-w-0 flex-1 justify-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-transparent"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                  <span
                    className={cn(
                      "flex-1 truncate text-[13px]",
                      isActive
                        ? "font-medium text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {label.name}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`${label.name} löschen`}
                  onClick={() => void onDeleteLabel(label.id)}
                  className="mr-2 size-auto hidden rounded text-muted-foreground hover:bg-transparent hover:text-foreground group-hover:block focus-visible:block"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
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
  {
    id: "drafts",
    label: "Drafts",
    icon: <Pencil className="h-4 w-4 shrink-0" />,
  },
  { id: "sent", label: "Sent", icon: <Send className="h-4 w-4 shrink-0" /> },
];

const MANAGEMENT_NAV: NavEntry[] = [
  {
    id: "archive",
    label: "Archive",
    icon: <Archive className="h-4 w-4 shrink-0" />,
  },
  { id: "spam", label: "Spam", icon: <Mail className="h-4 w-4 shrink-0" /> },
  { id: "bin", label: "Bin", icon: <Trash2 className="h-4 w-4 shrink-0" /> },
];

// ─── NavItem ──────────────────────────────────────────────────────────────────

type NavItemProps = NavEntry & {
  activeFolder: Folder;
  badge?: number;
  onFolderChange: (f: Folder) => void;
};

function NavItem({
  id,
  label,
  icon,
  badge,
  activeFolder,
  onFolderChange,
}: NavItemProps) {
  const isActive = activeFolder === id;
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => onFolderChange(id)}
      className={cn(
        "h-auto justify-start flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] font-normal",
        isActive
          ? "text-primary font-medium "
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {icon}
      <span className="flex-1 truncate">{label}</span>
      {badge != null && badge > 0 && (
        <span className="flex h-4 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
          {badge}
        </span>
      )}
    </Button>
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
  const label = (integration.display_name ?? integration.email)
    .slice(0, 1)
    .toUpperCase();
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

function AccountSwitcher({
  integrations,
  selectedId,
  creators,
  onSelect,
}: AccountSwitcherProps) {
  const selected =
    integrations.find((i) => i.id === selectedId) ?? integrations[0];
  const creatorName = (integ: Integration) =>
    integ.creator_id
      ? (creators.find((c) => c.id === integ.creator_id)?.full_name ?? null)
      : null;

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
                {creatorName(selected) ??
                  selected.display_name ??
                  selected.email}
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
            <p className="truncate text-[13px] text-muted-foreground">
              Kein Postfach
            </p>
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
          className="w-56! p-1!"
          sideOffset={6}
        >
          {integrations.map((integ) => (
            <Button
              key={integ.id}
              type="button"
              variant="ghost"
              onClick={() => onSelect(integ.id)}
              className="h-auto justify-start flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-muted"
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
            </Button>
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
}: InboxSidebarProps) {
  return (
    <div className="flex h-full w-full select-none flex-col overflow-hidden bg-white py-3">
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
        <Button
          type="button"
          variant="outline"
          onClick={onCompose}
          className="h-8 w-full gap-2 rounded-lg border-[#E7E7E7] bg-transparent text-sm font-normal text-foreground hover:bg-muted/50"
        >
          <Pencil className="h-3.5 w-3.5" />
          New Email
        </Button>
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
    </div>
  );
}
