"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { CreatorAccount } from "@/domains/social-accounts/types";
import {
  SiInstagram,
  SiOnlyfans,
  SiSpotify,
  SiTiktok,
  SiX,
  SiYoutube,
} from "react-icons/si";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Creator = {
  id: string;
  full_name: string;
  handle: string | null;
  initials: string;
  color: string;
  niche: string | null;
  status: "active" | "on-break" | "inactive";
  platforms: string[];
  followers: string | null;
  monthly_revenue: number;
};

export type Brand = {
  id: string;
  company_name: string;
  short_code: string;
  color: string;
};

export type Deal = {
  id: string;
  creator_id: string | null;
  brand_id: string | null;
  title: string;
  budget: number;
  status: string;
  deadline: string | null;
  campaign_type: string | null;
  deliverables: string[];
};

export type Mailbox = {
  id: string;
  email: string;
  display_name: string | null;
  provider: string;
  creator_id: string | null;
};

export type CreatorsData = {
  creators: Creator[];
  brands: Brand[];
  deals: Deal[];
  mailboxes: Mailbox[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CLASS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  "on-break": "bg-yellow-100 text-yellow-700",
  inactive: "bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Aktiv",
  "on-break": "Pause",
  inactive: "Inaktiv",
};

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  Instagram: <SiInstagram />,
  TikTok: <SiTiktok />,
  YouTube: <SiYoutube />,
  Spotify: <SiSpotify />,
  OnlyFans: <SiOnlyfans />,
  X: <SiX />,
};

// Maps creator wizard display names → platform keys used in creator_accounts
const PLATFORM_KEY: Record<string, string> = {
  YouTube: "youtube",
  Instagram: "instagram",
  TikTok: "tiktok",
  Spotify: "spotify",
  OnlyFans: "onlyfans",
  X: "x",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(n: number) {
  return `$${(n / 1000).toFixed(1)}k`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({
  c,
  size = "md",
}: {
  c: Creator;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const cls = {
    sm: "w-7 h-7 text-[10px]",
    md: "w-9 h-9 text-xs",
    lg: "w-11 h-11 text-sm",
    xl: "w-14 h-14 text-base",
  }[size];
  return (
    <span
      className={cn(
        "rounded-xl inline-flex items-center justify-center font-bold text-white shrink-0",
        cls,
      )}
      style={{ background: c.color }}
    >
      {c.initials}
    </span>
  );
}

// ─── Creator Sheet ────────────────────────────────────────────────────────────

interface CreatorSheetProps {
  creator: Creator | null;
  deals: Deal[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: (id: string) => Promise<void>;
}

export function CreatorSheet({
  creator,
  deals,
  open,
  onOpenChange,
  onDelete,
}: CreatorSheetProps) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: accountsData } = useQuery<{ accounts: CreatorAccount[] }>({
    queryKey: ["creator-accounts", creator?.id],
    queryFn: () =>
      fetch(`/api/creators/${creator!.id}/accounts`).then((r) => r.json()),
    enabled: open && !!creator,
    staleTime: 60_000,
  });

  const connectedByKey = new Set(
    (accountsData?.accounts ?? [])
      .filter((a) => a.sync_status === "active")
      .map((a) => a.platform),
  );

  async function handleDelete() {
    if (!creator || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(creator.id);
      setConfirmDelete(false);
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  }

  if (!creator) return null;

  const creatorDeals = deals.filter((d) => d.creator_id === creator.id);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex flex-col gap-0 p-0 overflow-hidden rounded-tl-4xl rounded-bl-4xl"
          style={{ width: "50vw", minWidth: "400px", maxWidth: "95vw" }}
        >
          {/* Header */}
          <SheetHeader className="px-6 pt-5 pb-5 border-b border-border-light shrink-0">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded-md text-muted-foreground">
                {creator.id.slice(0, 8).toUpperCase()}
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => router.push(`/creators/edit-form/${creator.id}`)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Bearbeiten
                </Button>
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Löschen
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Avatar c={creator} size="xl" />
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-xl font-semibold tracking-tight">
                  {creator.full_name}
                </SheetTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {creator.handle ?? "—"} · {creator.niche ?? "—"}
                </p>
                <span
                  className={cn(
                    "inline-block mt-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                    STATUS_CLASS[creator.status],
                  )}
                >
                  {STATUS_LABEL[creator.status]}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-5 shrink-0 pt-1 text-right">
                {[
                  { label: "Reach", value: creator.followers ?? "—" },
                  { label: "Deals", value: creatorDeals.length },
                  { label: "MTD", value: formatMoney(creator.monthly_revenue) },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="text-[10px] text-muted-foreground mb-0.5">
                      {s.label}
                    </div>
                    <div className="text-lg font-semibold tabular-nums">
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SheetHeader>

          {/* Verbundene Schnittstellen */}
          <div className="flex-1 overflow-y-auto p-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Verbundene Schnittstellen
            </h3>

            {creator.platforms.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Keine Plattformen verknüpft.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {creator.platforms.map((p) => {
                  const icon = PLATFORM_ICONS[p];
                  const key = PLATFORM_KEY[p] ?? p.toLowerCase();
                  const isConnected = connectedByKey.has(key);
                  const account = (accountsData?.accounts ?? []).find(
                    (a) =>
                      (a.platform as string) === key &&
                      a.sync_status === "active",
                  );
                  return (
                    <div
                      key={p}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border-light bg-muted/30"
                    >
                      <span className="text-lg text-muted-foreground shrink-0">
                        {icon ?? (
                          <span className="text-xs font-medium">{p[0]}</span>
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{p}</span>
                        {account?.username && (
                          <p className="text-xs text-muted-foreground truncate">
                            @{account.username}
                          </p>
                        )}
                      </div>
                      {isConnected ? (
                        <span className="flex items-center gap-1.5 text-xs text-success">
                          <span className="w-1.5 h-1.5 rounded-full bg-success" />
                          Verbunden
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                          Nicht verbunden
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Creator löschen?</DialogTitle>
            <DialogDescription>
              <strong>{creator.full_name}</strong> wird dauerhaft gelöscht. Diese
              Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              disabled={isDeleting}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Wird gelöscht…" : "Löschen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
