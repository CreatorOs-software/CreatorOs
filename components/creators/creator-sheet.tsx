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
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CREATOR_STATUS_CLASS as STATUS_CLASS,
  CREATOR_STATUS_LABEL as STATUS_LABEL,
} from "@/components/creators/dashboard/constants";
import { formatMoney } from "@/lib/formatters";
import { AvatarCreator } from "@/components/ui/avatar-creator";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Creator = {
  id: string;
  full_name: string;
  handle: string | null;
  initials: string;
  color: string;
  niche: string[];
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
              <AvatarCreator initials={creator.initials} color={creator.color} size="xl" />
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-xl font-semibold tracking-tight">
                  {creator.full_name}
                </SheetTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {creator.handle ?? "—"}{creator.niche.length > 0 ? ` · ${creator.niche.join(", ")}` : ""}
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

          {/* ── Übersicht ── */}
          <div className="flex-1 overflow-y-auto p-6">
            {creatorDeals.length > 0 && (() => {
              const totalBudget = creatorDeals.reduce(
                (s, d) => s + (d.budget ?? 0),
                0,
              );
              const upcoming = creatorDeals
                .filter((d) => d.deadline && new Date(d.deadline) >= new Date())
                .sort(
                  (a, b) =>
                    new Date(a.deadline!).getTime() -
                    new Date(b.deadline!).getTime(),
                );
              const nextDl = upcoming[0]?.deadline
                ? new Date(upcoming[0].deadline).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                  })
                : "—";
              return (
                <>
                  <div className="border-t border-border-light my-5" />
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Übersicht
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Deals", value: String(creatorDeals.length) },
                      {
                        label: "Budget gesamt",
                        value: `€${(totalBudget / 1000).toFixed(1)}k`,
                      },
                      { label: "Nächste Deadline", value: nextDl },
                    ].map((s) => (
                      <Card
                        key={s.label}
                        className="px-3 py-2.5 gap-0 bg-muted/30 shadow-none border border-border-light"
                      >
                        <div className="text-[10px] text-muted-foreground">
                          {s.label}
                        </div>
                        <div className="text-sm font-semibold tabular-nums mt-0.5">
                          {s.value}
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              );
            })()}
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
