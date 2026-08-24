"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, CheckCircle2, XCircle, Pencil, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Anfrage } from "../types";
import { fmtMoney } from "../constants";
import {
  AnfrageBrandAvatar,
  STATUS_META,
  STATUS_ORDER,
  daysSince,
  isEndState,
} from "./anfragen-columns";

const SOURCE_LABEL: Record<string, string> = {
  email: "E-Mail",
  ig_dm: "IG DM",
  whatsapp: "WhatsApp",
  manual: "Manuell",
};

export function AnfrageDialog({
  anfrage: initialAnfrage,
  open,
  onClose,
  onUpdated,
  onDeleted,
  creatorId,
}: {
  anfrage: Anfrage | null;
  open: boolean;
  onClose: () => void;
  onUpdated: (a: Anfrage) => void;
  onDeleted: (id: string) => void;
  creatorId: string;
}) {
  const router = useRouter();
  const [anfrage, setAnfrage] = useState<Anfrage | null>(initialAnfrage);
  const [statusLoading, setStatusLoading] = useState(false);
  const [notesValue, setNotesValue] = useState(initialAnfrage?.notes ?? "");
  const [notesSaving, setNotesSaving] = useState(false);
  const [offerValue, setOfferValue] = useState(
    initialAnfrage?.budget_offer != null ? String(initialAnfrage.budget_offer) : "",
  );
  const [offerSaving, setOfferSaving] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [gewonnenLoading, setGewonnenLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  if (!anfrage) return null;

  const meta = STATUS_META[anfrage.status];
  const days = daysSince(anfrage.created_at);
  const brandDisplay = anfrage.brands?.company_name ?? anfrage.brand_name ?? "—";
  const isEnd = isEndState(anfrage.status);

  async function patchAnfrage(patch: Partial<Anfrage>) {
    if (!anfrage) return;
    const res = await fetch(`/api/anfragen/${anfrage.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error("PATCH failed");
    const updated = { ...anfrage, ...patch } as Anfrage;
    setAnfrage(updated);
    onUpdated(updated);
    router.refresh();
    return updated;
  }

  async function handleStatusChange(newStatus: Anfrage["status"]) {
    if (!anfrage || statusLoading) return;
    setStatusLoading(true);
    try {
      await patchAnfrage({ status: newStatus });
    } finally {
      setStatusLoading(false);
    }
  }

  async function handleSaveNotes() {
    setNotesSaving(true);
    try {
      await patchAnfrage({ notes: notesValue || null });
    } finally {
      setNotesSaving(false);
    }
  }

  async function handleSaveOffer() {
    const val = parseFloat(offerValue.replace(",", "."));
    setOfferSaving(true);
    try {
      await patchAnfrage({ budget_offer: isNaN(val) ? null : val });
    } finally {
      setOfferSaving(false);
    }
  }

  async function handleReject() {
    setStatusLoading(true);
    try {
      await patchAnfrage({ status: "abgelehnt", rejection_reason: rejectReason || null });
      setRejectOpen(false);
    } finally {
      setStatusLoading(false);
    }
  }

  async function handleGewonnen() {
    if (!anfrage) return;
    setGewonnenLoading(true);
    try {
      const res = await fetch(`/api/anfragen/${anfrage.id}/gewonnen`, { method: "POST" });
      if (!res.ok) throw new Error("Fehler beim Anlegen");
      const { deal_id } = await res.json();
      const updated = { ...anfrage, status: "gewonnen" as const };
      setAnfrage(updated);
      onUpdated(updated);
      router.refresh();
      onClose();
      router.push(`/creators/deals/edit/${deal_id}`);
    } finally {
      setGewonnenLoading(false);
    }
  }

  async function handleDelete() {
    if (!anfrage) return;
    setDeleteLoading(true);
    try {
      await fetch(`/api/anfragen/${anfrage.id}`, { method: "DELETE" });
      onDeleted(anfrage.id);
      setDeleteOpen(false);
      onClose();
      router.refresh();
    } finally {
      setDeleteLoading(false);
    }
  }

  const nextStatus =
    STATUS_ORDER[STATUS_ORDER.indexOf(anfrage.status as (typeof STATUS_ORDER)[number]) + 1] ?? null;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent
          className="max-w-lg sm:max-w-lg p-0 gap-0 overflow-hidden"
          showCloseButton={false}
        >
          {/* Header */}
          <div className="p-5 pb-4 border-b">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <AnfrageBrandAvatar anfrage={anfrage} />
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold leading-tight truncate">{brandDisplay}</h2>
                  {anfrage.contact_person && (
                    <p className="text-xs text-muted-foreground">{anfrage.contact_person}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                  <Pencil className="w-3 h-3" />
                  Bearbeiten
                </Button>
                <DialogClose
                  render={<Button variant="ghost" size="icon-sm" className="-mt-0.5 -mr-1" />}
                >
                  <X className="w-4 h-4" />
                  <span className="sr-only">Schließen</span>
                </DialogClose>
              </div>
            </div>

            {/* Status stepper */}
            {!isEnd && (
              <div className="mt-4 flex items-center gap-1">
                {STATUS_ORDER.map((s, i) => {
                  const currentIdx = STATUS_ORDER.indexOf(
                    anfrage.status as (typeof STATUS_ORDER)[number],
                  );
                  const isDone = i < currentIdx;
                  const isCurrent = i === currentIdx;
                  const isClickable = i === currentIdx + 1;
                  return (
                    <div key={s} className="flex items-center gap-1 flex-1 min-w-0">
                      <button
                        disabled={!isClickable || statusLoading}
                        onClick={() => isClickable && handleStatusChange(s)}
                        className={cn(
                          "flex-1 h-1.5 rounded-full transition-colors",
                          isDone && "bg-emerald-500",
                          isCurrent && "bg-accent",
                          isClickable && "bg-muted hover:bg-accent/60 cursor-pointer",
                          !isDone && !isCurrent && !isClickable && "bg-muted opacity-40 cursor-default",
                        )}
                        title={STATUS_META[s].label}
                      />
                    </div>
                  );
                })}
              </div>
            )}
            {!isEnd && (
              <div className="flex justify-between mt-1">
                {STATUS_ORDER.map((s) => (
                  <span
                    key={s}
                    className="text-[9px] text-muted-foreground flex-1 text-center first:text-left last:text-right"
                  >
                    {STATUS_META[s].label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Body */}
          <div className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[60vh]">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Format</p>
                <p className="text-xs font-medium">{anfrage.format ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Quelle</p>
                <p className="text-xs font-medium">
                  {SOURCE_LABEL[anfrage.source] ?? anfrage.source}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Budget angefragt</p>
                <p className="text-xs font-medium">
                  {anfrage.budget_requested != null ? fmtMoney(anfrage.budget_requested) : "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Liegt seit</p>
                <p className={cn("text-xs font-medium", days >= 4 ? "text-red-500" : "")}>
                  {days === 0 ? "heute" : `${days} Tag${days !== 1 ? "en" : ""}`}
                </p>
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Unser Angebot (€)
              </p>
              <div className="flex gap-2">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={offerValue}
                  onChange={(e) => setOfferValue(e.target.value)}
                  placeholder={anfrage.budget_requested != null ? String(anfrage.budget_requested) : "0"}
                  className="h-8 w-36"
                />
                <Button variant="outline" size="sm" disabled={offerSaving} onClick={handleSaveOffer}>
                  {offerSaving ? "…" : "Speichern"}
                </Button>
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Notizen</p>
              <Textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                rows={3}
                placeholder="Anmerkungen, nächste Schritte, …"
                className="resize-none"
              />
              {notesValue !== (anfrage.notes ?? "") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1"
                  disabled={notesSaving}
                  onClick={handleSaveNotes}
                >
                  {notesSaving ? "Speichern…" : "Notiz speichern"}
                </Button>
              )}
            </div>

            {anfrage.rejection_reason && (
              <div className="rounded-lg bg-red-500/10 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-red-500 mb-0.5">Ablehnungsgrund</p>
                <p className="text-xs text-red-700">{anfrage.rejection_reason}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 pt-3 border-t flex items-center justify-between gap-2">
            <div className="flex gap-2">
              {!isEnd && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setRejectOpen(true)}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Ablehnen
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="flex gap-2">
              {!isEnd && nextStatus && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={statusLoading}
                  onClick={() => handleStatusChange(nextStatus)}
                >
                  → {STATUS_META[nextStatus].label}
                </Button>
              )}
              {(anfrage.status === "zugesagt" || anfrage.status === "gewonnen") && (
                <Button
                  size="sm"
                  disabled={gewonnenLoading || anfrage.status === "gewonnen"}
                  onClick={handleGewonnen}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {gewonnenLoading
                    ? "Anlegen…"
                    : anfrage.status === "gewonnen"
                      ? "Deal angelegt ✓"
                      : "Deal anlegen"}
                </Button>
              )}
              {anfrage.status === "gewonnen" && anfrage.linked_deal_id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/creators/deals/edit/${anfrage.linked_deal_id}`)}
                >
                  Zum Deal
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ablehnen */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Anfrage ablehnen</DialogTitle>
          </DialogHeader>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Grund (optional)
            </label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Budget zu niedrig, falsches Format, …"
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Abbrechen</DialogClose>
            <Button variant="destructive" disabled={statusLoading} onClick={handleReject}>
              {statusLoading ? "…" : "Ablehnen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Löschen bestätigen */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Anfrage löschen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Die Anfrage von{" "}
            <span className="font-medium text-foreground">{brandDisplay}</span>{" "}
            wird unwiderruflich gelöscht.
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Abbrechen</DialogClose>
            <Button variant="destructive" disabled={deleteLoading} onClick={handleDelete}>
              {deleteLoading ? "Löschen…" : "Löschen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
