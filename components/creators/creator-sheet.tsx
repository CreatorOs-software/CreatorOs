"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Typography,
} from "@talentos/ui";
import { cn } from "@/lib/utils";
import {
  CREATOR_STATUS_CLASS as STATUS_CLASS,
  CREATOR_STATUS_LABEL as STATUS_LABEL,
} from "@/components/creators/dashboard/constants";
import { formatMoney } from "@/lib/formatters";
import { AvatarCreator } from "@/components/ui/avatar-creator";

// ─── Types ────────────────────────────────────────────────────────────────────

import type {
  Creator,
  Brand,
  Deal,
  CreatorMailbox as Mailbox,
  CreatorsPageData as CreatorsData,
} from "@/domains/creators";

export type { Creator, Brand, Deal, Mailbox, CreatorsData };

// ─── Metric ───────────────────────────────────────────────────────────────────

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <Typography variant="muted">{label}</Typography>
      <Typography variant="large" className="truncate tabular-nums">
        {value}
      </Typography>
    </div>
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

  const dealCount = deals.filter((d) => d.creator_id === creator.id).length;
  const subtitle = [creator.handle ?? "—", creator.niche.join(", ")]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right">
          <SheetHeader>
            <div className="flex flex-col gap-5 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <Typography variant="code" className="text-xs">
                  {creator.id.slice(0, 8).toUpperCase()}
                </Typography>
                <div className="ml-auto flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      router.push(`/creators/edit-form/${creator.id}`)
                    }
                  >
                    <Pencil />
                    Bearbeiten
                  </Button>
                  {onDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 />
                      Löschen
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <AvatarCreator initials={creator.initials} avatarConfig={creator.avatar_config} seed={creator.id} name={creator.full_name} size="lg" />
                <div className="min-w-0 flex-1">
                  <SheetTitle className="truncate">
                    {creator.full_name}
                  </SheetTitle>
                  <SheetDescription className="truncate">
                    {subtitle}
                  </SheetDescription>
                  <span
                    className={cn(
                      "mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                      STATUS_CLASS[creator.status],
                    )}
                  >
                    {STATUS_LABEL[creator.status]}
                  </span>
                </div>
              </div>

              {creator.phone && (
                <Typography
                  variant="muted"
                  className="flex items-center gap-1.5 text-xs"
                >
                  {creator.phone}
                  {creator.whatsapp_opt_in && (
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
                      WA
                    </span>
                  )}
                </Typography>
              )}

              <div className="grid grid-cols-3 gap-3">
                <Metric label="Reach" value={creator.followers ?? "—"} />
                <Metric label="Deals" value={dealCount} />
                <Metric
                  label="MTD"
                  value={formatMoney(creator.monthly_revenue)}
                />
              </div>
            </div>
          </SheetHeader>
        </SheetContent>
      </Sheet>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
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
