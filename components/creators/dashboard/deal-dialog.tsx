"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BrandAvatar } from "./shared";
import { Switch } from "@/components/ui/switch";
import type { DealFull, PaymentItem, Deliverable } from "./types";
import { ALT, LAUFEND, PIPELINE, fmtMoney } from "./constants";

// ── Stage stepper ─────────────────────────────────────────────

const DIALOG_STAGES: { label: string; ids: string[]; target: string }[] = [
  { label: "Briefing", ids: ["incoming", "evaluating", "negotiation", "confirmed"], target: "confirmed" },
  { label: "In Produktion", ids: ["production"], target: "production" },
  { label: "Freigabe", ids: ["approval"], target: "approval" },
  { label: "Live", ids: ["scheduled", "posted", "invoiced", "paid"], target: "posted" },
];

function stageIndex(status: string): number {
  return DIALOG_STAGES.findIndex((s) => s.ids.includes(status));
}

function DealStepper({
  status,
  loading,
  onStageClick,
}: {
  status: string;
  blocker: string | null;
  loading: boolean;
  onStageClick: (target: string) => void;
}) {
  const currentIdx = stageIndex(status);

  return (
    <div>
      <div className="flex items-center gap-1">
        {DIALOG_STAGES.map((stage, i) => {
          const isDone = i < currentIdx;
          const isCurrent = i === currentIdx;
          const isNext = i === currentIdx + 1;
          return (
            <button
              key={i}
              type="button"
              disabled={!isNext || loading}
              onClick={() => isNext && onStageClick(stage.target)}
              className={cn(
                "flex-1 h-1.5 rounded-full transition-colors",
                isDone && "bg-emerald-500",
                isCurrent && "bg-accent",
                isNext && "bg-muted hover:bg-accent/60 cursor-pointer",
                !isDone && !isCurrent && !isNext && "bg-muted opacity-40 cursor-default",
              )}
              title={stage.label}
            />
          );
        })}
      </div>
      <div className="flex mt-1.5">
        {DIALOG_STAGES.map((stage, i) => (
          <span
            key={i}
            className={cn(
              "text-[9px] flex-1 text-center first:text-left last:text-right",
              i === currentIdx ? "font-semibold text-foreground" : "text-muted-foreground",
            )}
          >
            {stage.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────

function formatDeliverables(
  deliverables: DealFull["deliverables"],
): { summary: string; platforms: string } | null {
  if (!deliverables || deliverables.length === 0) return null;

  if (typeof deliverables[0] === "object" && deliverables[0] !== null) {
    const items = deliverables as Deliverable[];
    const summary = items.map((d) => `${d.count} ${d.content_type}`).join(" + ");
    const platforms = [...new Set(items.map((d) => d.platform))].join(", ");
    return { summary, platforms };
  }

  return { summary: (deliverables as string[]).join(", "), platforms: "" };
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function fmtDE(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtShort(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
  });
}

function getPayStatus(item: PaymentItem) {
  if (!item.invoice_date)
    return { dueDate: null, overdue: false, daysOverdue: 0 };
  const dueDate = addDays(item.invoice_date, item.payment_term);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  if (due < today) {
    const daysOverdue = Math.floor(
      (today.getTime() - due.getTime()) / 86_400_000,
    );
    return { dueDate, overdue: true, daysOverdue };
  }
  return { dueDate, overdue: false, daysOverdue: 0 };
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
      {children}
    </p>
  );
}

function Empty() {
  return <span className="text-muted-foreground/40 text-xs">—</span>;
}

function FieldCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-3.5 flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
        {label}
      </span>
      {children}
    </div>
  );
}

// ── Main Dialog ───────────────────────────────────────────────

interface DealDialogProps {
  deal: DealFull | null;
  creatorName?: string;
  open: boolean;
  onClose: () => void;
}

export function DealDialog({
  deal,
  creatorName,
  open,
  onClose,
}: DealDialogProps) {
  const router = useRouter();
  const [localStatus, setLocalStatus] = useState<string>("");
  const [statusLoading, setStatusLoading] = useState(false);
  const [localPaymentItems, setLocalPaymentItems] = useState<PaymentItem[]>([]);
  const [payLoading, setPayLoading] = useState<number | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    if (deal?.status) setLocalStatus(deal.status);
  }, [deal?.id, deal?.status]);

  useEffect(() => {
    setLocalPaymentItems((deal?.payment_items ?? []) as PaymentItem[]);
    setIsDirty(false);
  }, [deal?.id]);

  if (!deal) return null;

  const delivFmt = formatDeliverables(deal.deliverables);
  const paymentItems = localPaymentItems;

  async function persistPaymentItems(items: PaymentItem[]) {
    await fetch(`/api/deals/${deal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_items: items }),
    });
    router.refresh();
  }

  async function savePaymentItems() {
    setSaveLoading(true);
    try {
      await persistPaymentItems(localPaymentItems);
      setIsDirty(false);
    } finally {
      setSaveLoading(false);
    }
  }

  async function markAsPaid(index: number) {
    if (payLoading !== null) return;
    setPayLoading(index);
    const today = new Date().toISOString().split("T")[0];
    const updated = localPaymentItems.map((item, i) =>
      i === index ? { ...item, paid_at: today } : item,
    );
    setLocalPaymentItems(updated);
    try {
      await persistPaymentItems(updated);
    } finally {
      setPayLoading(null);
    }
  }

  function handleInvoiceToggle(index: number, checked: boolean) {
    const today = new Date().toISOString().split("T")[0];
    const updated = localPaymentItems.map((item, i) =>
      i === index ? { ...item, invoice_date: checked ? today : "" } : item,
    );
    setLocalPaymentItems(updated);
    setIsDirty(true);
  }

  function handleInvoiceDateChange(index: number, date: string) {
    const updated = localPaymentItems.map((item, i) =>
      i === index ? { ...item, invoice_date: date } : item,
    );
    setLocalPaymentItems(updated);
    setIsDirty(true);
  }

  const subtitleParts = [
    deal.brands?.company_name,
    creatorName,
    deal.platform,
  ].filter(Boolean);

  const isPipeline = PIPELINE.has(localStatus);
  const isLaufend = LAUFEND.has(localStatus);
  const isAbgeschlossen = ALT.has(localStatus);

  async function handleStatusChange(newStatus: string) {
    if (statusLoading || newStatus === localStatus) return;
    setStatusLoading(true);
    setLocalStatus(newStatus);
    try {
      await fetch(`/api/deals/${deal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } finally {
      setStatusLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        className="max-w-5xl sm:max-w-5xl p-0 gap-0 overflow-hidden"
        showCloseButton={false}
      >
        <div className="flex flex-col max-h-[88vh]">
          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b border-border-light shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                {deal.brands && <BrandAvatar brand={deal.brands} size="md" />}
                <div className="min-w-0">
                  <DialogTitle className="text-base font-semibold leading-tight">
                    {deal.title}
                  </DialogTitle>
                  {subtitleParts.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {subtitleParts.join(" · ")}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => {
                    onClose();
                    router.push(`/creators/deals/edit/${deal.id}`);
                  }}
                >
                  <Pencil className="w-3 h-3" />
                  Bearbeiten
                </Button>
                <DialogClose
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="-mt-0.5 -mr-1"
                    />
                  }
                >
                  <X className="w-4 h-4" />
                  <span className="sr-only">Schließen</span>
                </DialogClose>
              </div>
            </div>

            {deal.blocker && (
              <div className="mt-3.5 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 text-amber-700 text-xs font-medium w-fit">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {deal.blocker}
              </div>
            )}
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-6">
            {/* STATUS */}
            <div>
              <SectionLabel>Status</SectionLabel>
              <DealStepper
                status={localStatus}
                blocker={deal.blocker}
                loading={statusLoading}
                onStageClick={handleStatusChange}
              />
            </div>

            {/* RAHMENDATEN */}
            <div>
              <SectionLabel>Rahmendaten</SectionLabel>
              <div className="rounded-xl border border-border-light overflow-hidden">
                <div className="grid grid-cols-3 divide-x divide-border-light">
                  <FieldCell label="Ansprechpartner">
                    {deal.contact_person ? (
                      <>
                        <span className="text-sm font-medium">
                          {deal.contact_person}
                        </span>
                        {deal.brands?.company_name && (
                          <span className="text-xs text-muted-foreground">
                            {deal.brands.company_name}
                          </span>
                        )}
                      </>
                    ) : (
                      <Empty />
                    )}
                  </FieldCell>
                  <FieldCell label="Deliverables">
                    {delivFmt ? (
                      <>
                        <span className="text-sm font-medium">
                          {delivFmt.summary}
                        </span>
                        {delivFmt.platforms && (
                          <span className="text-xs text-muted-foreground">
                            {delivFmt.platforms}
                          </span>
                        )}
                      </>
                    ) : (
                      <Empty />
                    )}
                  </FieldCell>
                  <FieldCell label="Nächste Deadline">
                    {deal.deadline ? (
                      <span className="text-sm font-medium">
                        {fmtDE(deal.deadline)}
                      </span>
                    ) : (
                      <Empty />
                    )}
                  </FieldCell>
                </div>
                <div className="grid grid-cols-3 divide-x divide-border-light border-t border-border-light">
                  <FieldCell label="Nutzungsrechte">
                    {deal.usage_rights ? (
                      <span className="text-sm">{deal.usage_rights}</span>
                    ) : (
                      <Empty />
                    )}
                  </FieldCell>
                  <FieldCell label="Sperrfrist / Exklusivität">
                    {deal.exclusivity ? (
                      <span className="text-sm">{deal.exclusivity}</span>
                    ) : (
                      <Empty />
                    )}
                  </FieldCell>
                  <FieldCell label="Notizen">
                    {deal.description ? (
                      <span className="text-sm whitespace-pre-wrap wrap-break-word">
                        {deal.description}
                      </span>
                    ) : (
                      <Empty />
                    )}
                  </FieldCell>
                </div>
              </div>
            </div>

            {/* ZAHLUNG */}
            <div>
              <SectionLabel>
                Zahlung
                {Number(deal.budget) > 0
                  ? ` · ${fmtMoney(Number(deal.budget))}`
                  : ""}
              </SectionLabel>

              {paymentItems.length > 0 ? (
                <>
                  <div className="rounded-xl border border-border-light overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border-light bg-muted/30">
                          {[
                            "Posten",
                            "Betrag",
                            "Rechnung gestellt",
                            "Zahlungsziel",
                            "Fällig am",
                            "Status",
                          ].map((h) => (
                            <th
                              key={h}
                              className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wide font-semibold text-muted-foreground"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-light">
                        {paymentItems.map((item, i) => {
                          const ps = getPayStatus(item);
                          return (
                            <tr key={i}>
                              <td className="px-3 py-3">
                                <span className="font-medium text-sm">
                                  {item.label || "Zahlung"}
                                </span>
                              </td>
                              <td className="px-3 py-3 font-medium tabular-nums">
                                {item.amount > 0 ? (
                                  fmtMoney(item.amount)
                                ) : (
                                  <Empty />
                                )}
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    size="sm"
                                    checked={!!item.invoice_date}
                                    onCheckedChange={(checked) => handleInvoiceToggle(i, checked)}
                                  />
                                  {item.invoice_date && (
                                    <input
                                      type="date"
                                      value={item.invoice_date}
                                      onChange={(e) => handleInvoiceDateChange(i, e.target.value)}
                                      className="h-7 rounded-lg border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-muted-foreground">
                                {item.payment_term} Tage
                              </td>
                              <td className="px-3 py-3">
                                {ps.dueDate ? (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-medium">
                                      {fmtShort(ps.dueDate)}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      automatisch
                                    </span>
                                  </div>
                                ) : (
                                  <Empty />
                                )}
                              </td>
                              <td className="px-3 py-3">
                                {item.paid_at ? (
                                  <div className="flex flex-col gap-1">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-700">
                                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                      Bezahlt
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {fmtDE(item.paid_at)}
                                    </span>
                                  </div>
                                ) : item.invoice_date ? (
                                  <div className="flex flex-col items-start gap-1.5">
                                    {ps.overdue ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                                        <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                                        Überfällig{" "}
                                        {ps.daysOverdue > 0
                                          ? `(${ps.daysOverdue}T)`
                                          : ""}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        offen
                                      </span>
                                    )}
                                    <Button
                                      variant="outline"
                                      className="h-6 text-[11px] px-2"
                                      disabled={payLoading !== null}
                                      onClick={() => markAsPaid(i)}
                                    >
                                      {payLoading === i ? "…" : "Als bezahlt markieren"}
                                    </Button>
                                  </div>
                                ) : (
                                  <Empty />
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Fälligkeit & Überfällig-Status berechnet das System
                    automatisch aus Rechnungsdatum + Zahlungsziel.
                  </p>
                </>
              ) : (
                <div className="rounded-xl border border-border-light p-5 text-center">
                  <p className="text-xs text-muted-foreground">
                    Keine Zahlungsposten hinterlegt
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border-light bg-muted/30 shrink-0 flex items-center justify-between">
            <DialogClose render={<Button variant="outline" />}>
              Schließen
            </DialogClose>

            <div className="flex items-center gap-2">
              {isDirty && (
                <Button
                  variant="outline"
                  disabled={saveLoading}
                  onClick={savePaymentItems}
                >
                  {saveLoading ? "Speichern…" : "Speichern"}
                </Button>
              )}
              {isPipeline && (
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/80"
                  disabled={statusLoading}
                  onClick={() => handleStatusChange("confirmed")}
                >
                  Deal starten
                </Button>
              )}
              {isLaufend && (
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/80"
                  disabled={statusLoading}
                  onClick={() => handleStatusChange("paid")}
                >
                  Deal abschließen → Archiv
                </Button>
              )}
              {isAbgeschlossen && (
                <span className="text-xs text-muted-foreground">
                  Deal abgeschlossen
                </span>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
