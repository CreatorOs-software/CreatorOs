"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Link2,
  Minus,
  Package,
  Plus,
  Tag,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandAvatar } from "./shared";
import type {
  ApprovalInfo,
  DealFull,
  DealGuidelines,
  DealRights,
  DeliveryInfo,
  Deliverable,
  Embargo,
  ExclusivityInfo,
  PaymentItem,
  TrackingAssets,
  WhitelistingInfo,
} from "./types";
import { ALT, LAUFEND, PIPELINE, fmtMoney } from "./constants";
import { Stepper } from "@/components/ui/stepper";
import type { Step as StepperStep } from "@/components/ui/stepper";

// ── Types ─────────────────────────────────────────────────────────────────────

type ContractStatus = "offen" | "versendet" | "unterschrieben";

type LocalState = {
  status: string;
  title: string;
  contact_person: string;
  description: string;
  deliverables: Deliverable[];
  usage_rights: string;
  exclusivity: string;
  payment_items: PaymentItem[];
  budget: number;
  campaign_start: string;
  campaign_end: string;
  contract_status: ContractStatus;
  contract_date: string;
  contract_url: string;
  rights: DealRights;
  approval_info: ApprovalInfo;
  delivery_info: DeliveryInfo;
  guidelines: DealGuidelines;
  tracking_assets: TrackingAssets;
  exclusivity_info: ExclusivityInfo;
  embargo: Embargo;
  whitelisting: WhitelistingInfo;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const DIALOG_STAGES = [
  {
    label: "Briefing",
    ids: ["incoming", "evaluating", "negotiation", "confirmed"],
    target: "confirmed",
  },
  { label: "In Produktion", ids: ["production"], target: "production" },
  { label: "Freigabe", ids: ["approval"], target: "approval" },
  {
    label: "Live",
    ids: ["scheduled", "posted", "invoiced", "paid"],
    target: "posted",
  },
];

const DELIV_STATUS_CFG: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  offen: { label: "Offen", bg: "bg-muted", text: "text-muted-foreground" },
  in_arbeit: {
    label: "In Arbeit",
    bg: "bg-blue-500/10",
    text: "text-blue-600",
  },
  in_freigabe: {
    label: "In Freigabe",
    bg: "bg-amber-500/10",
    text: "text-amber-700",
  },
  live: { label: "Live", bg: "bg-green-500/10", text: "text-green-700" },
  abgelehnt: {
    label: "Abgelehnt",
    bg: "bg-red-500/10",
    text: "text-red-600",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildLocalState(d: DealFull): LocalState {
  return {
    status: d.status ?? "",
    title: d.title ?? "",
    contact_person: d.contact_person ?? "",
    description: d.description ?? "",
    deliverables: (d.deliverables ?? []) as Deliverable[],
    usage_rights: d.usage_rights ?? "",
    exclusivity: d.exclusivity ?? "",
    payment_items: (d.payment_items ?? []) as PaymentItem[],
    budget: d.budget ?? 0,
    campaign_start: d.campaign_start ?? "",
    campaign_end: d.campaign_end ?? "",
    contract_status: d.contract_status ?? "offen",
    contract_date: d.contract_date ?? "",
    contract_url: d.contract_url ?? "",
    rights: d.rights ?? {},
    approval_info: d.approval_info ?? {},
    delivery_info: d.delivery_info ?? {},
    guidelines: d.guidelines ?? {},
    tracking_assets: d.tracking_assets ?? {},
    exclusivity_info: d.exclusivity_info ?? {},
    embargo: d.embargo ?? {},
    whitelisting: d.whitelisting ?? {},
  };
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

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil(
    (new Date(dateStr + "T00:00:00").getTime() - today.getTime()) / 86_400_000,
  );
}

function isOverdue(dateStr: string) {
  return daysUntil(dateStr) < 0;
}

function isSoonish(dateStr: string) {
  const d = daysUntil(dateStr);
  return d >= 0 && d <= 3;
}

function getNextDeadline(deliverables: Deliverable[]): string | null {
  const dates = deliverables
    .map((d) => d.draft_deadline)
    .filter((d): d is string => !!d)
    .sort();
  return dates[0] ?? null;
}

function computeExpiry(
  rights: DealRights,
  campaignStart?: string,
): string | null {
  const startDate =
    rights.duration_start_type === "live_gang"
      ? rights.live_gang_date
      : rights.duration_start_type === "kampagnenstart"
        ? campaignStart
        : null;
  if (!startDate || !rights.duration_value || !rights.duration_unit)
    return null;
  const start = new Date(startDate + "T00:00:00");
  const val = rights.duration_value;
  if (rights.duration_unit === "wochen")
    start.setDate(start.getDate() + val * 7);
  else if (rights.duration_unit === "monate")
    start.setMonth(start.getMonth() + val);
  return start.toISOString().split("T")[0];
}

function getPayStatus(item: PaymentItem) {
  if (!item.invoice_date)
    return { dueDate: null, overdue: false, daysOverdue: 0 };
  const dueDate = addDays(item.invoice_date, item.payment_term);
  const overdue = isOverdue(dueDate);
  return {
    dueDate,
    overdue,
    daysOverdue: overdue ? Math.abs(daysUntil(dueDate)) : 0,
  };
}

function stageIndex(status: string): number {
  return DIALOG_STAGES.findIndex((s) => s.ids.includes(status));
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
      {children}
    </p>
  );
}

function Empty() {
  return <span className="text-muted-foreground/40 text-xs">—</span>;
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-2.5">
      <span className="w-32 shrink-0 text-xs text-muted-foreground pt-0.5">
        {label}
      </span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function InlineInput({
  value,
  onChange,
  placeholder,
  multiline,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const cls =
    "w-full bg-muted/50 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:bg-muted rounded-md px-2 py-1 transition-colors";
  if (multiline) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className={cn(cls, "resize-none")}
      />
    );
  }
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cls}
    />
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
      title="Kopieren"
    >
      {copied ? (
        <Check className="size-3.5 text-green-600" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </button>
  );
}

function Collapsible({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border-light overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
      >
        {title}
        {open ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-border-light">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Stepper ────────────────────────────────────────────────────────────────────

const DIALOG_STEPS: StepperStep[] = DIALOG_STAGES.map((s, i) => ({
  id: i + 1,
  label: s.label,
}));

function DealStepper({
  status,
  loading,
  onStageClick,
}: {
  status: string;
  loading: boolean;
  onStageClick: (target: string) => void;
}) {
  const current = Math.max(1, stageIndex(status) + 1);
  return (
    <Stepper
      steps={DIALOG_STEPS}
      current={current}
      onStepClick={
        loading ? undefined : (id) => onStageClick(DIALOG_STAGES[id - 1].target)
      }
    />
  );
}

// ── Tab 1: Überblick ──────────────────────────────────────────────────────────

function UeberblickTab({
  local,
  patchLocal,
}: {
  local: LocalState;
  patchLocal: (patch: Partial<LocalState>) => void;
}) {
  const nextDeadline = getNextDeadline(local.deliverables);
  const inProduction = local.status === "production";
  const contractUnsigned = local.contract_status !== "unterschrieben";

  return (
    <div className="flex flex-col gap-3">
      {inProduction && contractUnsigned && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 text-amber-700 text-xs font-medium">
          <AlertTriangle className="size-3.5 shrink-0" />
          Deal ist in Produktion, aber der Vertrag ist noch nicht
          unterschrieben.
        </div>
      )}

      {/* Deal info */}
      <div className="rounded-xl border border-border-light overflow-hidden py-1">
        <FieldRow label="Kampagnentitel">
          <InlineInput
            value={local.title}
            onChange={(v) => patchLocal({ title: v })}
            placeholder="Deal-Titel…"
          />
        </FieldRow>
        <FieldRow label="Ansprechpartner">
          <InlineInput
            value={local.contact_person}
            onChange={(v) => patchLocal({ contact_person: v })}
            placeholder="Name…"
          />
        </FieldRow>
        <FieldRow label="Kampagnenzeitraum">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={local.campaign_start}
              onChange={(e) => patchLocal({ campaign_start: e.target.value })}
              className="bg-muted/50 text-sm text-foreground outline-none focus:bg-muted rounded-md px-2 py-1 transition-colors"
            />
            <span className="text-muted-foreground text-xs">–</span>
            <input
              type="date"
              value={local.campaign_end}
              onChange={(e) => patchLocal({ campaign_end: e.target.value })}
              className="bg-muted/50 text-sm text-foreground outline-none focus:bg-muted rounded-md px-2 py-1 transition-colors"
            />
          </div>
        </FieldRow>
        <FieldRow label="Nächste Deadline">
          {nextDeadline ? (
            <span
              className={cn(
                "text-sm font-medium",
                isOverdue(nextDeadline)
                  ? "text-red-600"
                  : isSoonish(nextDeadline)
                    ? "text-amber-600"
                    : "text-foreground",
              )}
            >
              {fmtDE(nextDeadline)}
              {isOverdue(nextDeadline) && (
                <span className="ml-1 text-xs font-normal">(überfällig)</span>
              )}
              {isSoonish(nextDeadline) && !isOverdue(nextDeadline) && (
                <span className="ml-1 text-xs font-normal">
                  ({daysUntil(nextDeadline)}d)
                </span>
              )}
            </span>
          ) : (
            <Empty />
          )}
        </FieldRow>
        <FieldRow label="Notizen">
          <InlineInput
            value={local.description}
            onChange={(v) => patchLocal({ description: v })}
            placeholder="Interne Notizen…"
            multiline
          />
        </FieldRow>
      </div>

      {/* Vertrag */}
      <div className="rounded-xl border border-border-light overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border-light flex items-center justify-between gap-4">
          <span className="text-xs font-medium text-muted-foreground">
            Vertrag
          </span>
          <div className="flex gap-1">
            {(["offen", "versendet", "unterschrieben"] as ContractStatus[]).map(
              (s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => patchLocal({ contract_status: s })}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                    local.contract_status === s
                      ? s === "unterschrieben"
                        ? "bg-green-500/15 text-green-700"
                        : s === "versendet"
                          ? "bg-blue-500/15 text-blue-600"
                          : "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60",
                  )}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ),
            )}
          </div>
        </div>
        {local.contract_status !== "offen" && (
          <div className="px-4 py-3 grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground">Datum</span>
              <input
                type="date"
                value={local.contract_date}
                onChange={(e) => patchLocal({ contract_date: e.target.value })}
                className="h-8 rounded-lg bg-muted px-3 text-xs outline-none focus:ring-1 focus:ring-ring/40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground">
                Vertragslink
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="url"
                  value={local.contract_url}
                  onChange={(e) => patchLocal({ contract_url: e.target.value })}
                  placeholder="https://…"
                  className="h-8 flex-1 rounded-lg bg-muted px-3 text-xs outline-none focus:ring-1 focus:ring-ring/40"
                />
                {local.contract_url && (
                  <a
                    href={local.contract_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab 2: Deliverables ───────────────────────────────────────────────────────

function DeliverablesTab({
  local,
  patchLocal,
}: {
  local: LocalState;
  patchLocal: (patch: Partial<LocalState>) => void;
}) {
  function patchDeliverable(index: number, patch: Partial<Deliverable>) {
    patchLocal({
      deliverables: local.deliverables.map((d, i) =>
        i === index ? { ...d, ...patch } : d,
      ),
    });
  }

  function patchApproval(patch: Partial<ApprovalInfo>) {
    patchLocal({ approval_info: { ...local.approval_info, ...patch } });
  }

  function patchDelivery(patch: Partial<DeliveryInfo>) {
    patchLocal({ delivery_info: { ...local.delivery_info, ...patch } });
  }

  const {
    approval_info,
    delivery_info,
    guidelines,
    tracking_assets,
    deliverables,
  } = local;

  const nearestDraft = deliverables
    .map((d) => d.draft_deadline)
    .filter(Boolean)
    .sort()[0];
  const productWarning =
    delivery_info?.status !== "erhalten" &&
    !!nearestDraft &&
    daysUntil(nearestDraft) <= 7;

  return (
    <div className="flex flex-col gap-5">
      {/* Deliverables table */}
      <div>
        <SectionLabel>Deliverables</SectionLabel>
        {deliverables.length > 0 ? (
          <div className="rounded-xl border border-border-light overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/30 border-b border-border-light">
                  {[
                    "Format",
                    "Draft-Deadline",
                    "Freigabe-Deadline",
                    "Live-Datum",
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
                {deliverables.map((d, i) => {
                  const draftOverdue =
                    d.draft_deadline && isOverdue(d.draft_deadline);
                  const draftSoon =
                    d.draft_deadline &&
                    !draftOverdue &&
                    isSoonish(d.draft_deadline);
                  const freigOverdue =
                    d.freigabe_deadline && isOverdue(d.freigabe_deadline);
                  const freigSoon =
                    d.freigabe_deadline &&
                    !freigOverdue &&
                    isSoonish(d.freigabe_deadline);
                  const statusCfg = d.status
                    ? DELIV_STATUS_CFG[d.status]
                    : DELIV_STATUS_CFG.offen;
                  return (
                    <tr key={i}>
                      <td className="px-3 py-2.5">
                        <span className="text-sm font-medium">
                          {d.count}× {d.content_type}
                        </span>
                        <p className="text-[10px] text-muted-foreground">
                          {d.platform}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={cn(
                            "text-xs",
                            draftOverdue
                              ? "text-red-600 font-medium"
                              : draftSoon
                                ? "text-amber-600 font-medium"
                                : "text-muted-foreground",
                          )}
                        >
                          {d.draft_deadline ? fmtDE(d.draft_deadline) : "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={cn(
                            "text-xs",
                            freigOverdue
                              ? "text-red-600 font-medium"
                              : freigSoon
                                ? "text-amber-600 font-medium"
                                : "text-muted-foreground",
                          )}
                        >
                          {d.freigabe_deadline
                            ? fmtDE(d.freigabe_deadline)
                            : "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-muted-foreground">
                          {d.live_date ? fmtDE(d.live_date) : "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          value={d.status ?? "offen"}
                          onChange={(e) =>
                            patchDeliverable(i, {
                              status: e.target.value as Deliverable["status"],
                            })
                          }
                          className={cn(
                            "rounded-full px-2 py-1 text-[10px] font-medium outline-none border-0 cursor-pointer",
                            statusCfg.bg,
                            statusCfg.text,
                          )}
                        >
                          {Object.entries(DELIV_STATUS_CFG).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-border-light p-5 text-center text-xs text-muted-foreground">
            Keine Deliverables hinterlegt
          </div>
        )}
      </div>

      {/* Freigabeprozess */}
      <div>
        <SectionLabel>Freigabeprozess</SectionLabel>
        <div className="rounded-xl border border-border-light p-4 flex flex-wrap gap-4 items-end">
          {/* Correction rounds */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground">
              Korrekturschleifen
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  patchApproval({
                    correction_rounds: Math.max(
                      0,
                      (approval_info?.correction_rounds ?? 0) - 1,
                    ),
                  })
                }
                className="size-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              >
                <Minus className="size-3" />
              </button>
              <span className="w-8 text-center text-sm font-semibold tabular-nums">
                {approval_info?.correction_rounds ?? 0}
              </span>
              <button
                type="button"
                onClick={() =>
                  patchApproval({
                    correction_rounds:
                      (approval_info?.correction_rounds ?? 0) + 1,
                  })
                }
                className="size-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              >
                <Plus className="size-3" />
              </button>
            </div>
          </div>
          {/* Used */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground">Verwendet</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  patchApproval({
                    corrections_used: Math.max(
                      0,
                      (approval_info?.corrections_used ?? 0) - 1,
                    ),
                  })
                }
                className="size-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              >
                <Minus className="size-3" />
              </button>
              <span className="w-8 text-center text-sm font-semibold tabular-nums">
                {approval_info?.corrections_used ?? 0}
              </span>
              <button
                type="button"
                onClick={() =>
                  patchApproval({
                    corrections_used:
                      (approval_info?.corrections_used ?? 0) + 1,
                  })
                }
                className="size-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              >
                <Plus className="size-3" />
              </button>
            </div>
          </div>
          {/* Approver */}
          <div className="flex flex-col gap-1 flex-1 min-w-32">
            <span className="text-[10px] text-muted-foreground">Freigeber</span>
            <input
              type="text"
              value={approval_info?.approver_name ?? ""}
              onChange={(e) =>
                patchApproval({ approver_name: e.target.value || null })
              }
              placeholder="Name…"
              className="h-8 bg-muted rounded-lg px-3 text-xs outline-none"
            />
          </div>
          {/* Response days */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground">
              Response (Tage)
            </span>
            <input
              type="number"
              min={0}
              value={approval_info?.approval_days ?? ""}
              onChange={(e) =>
                patchApproval({
                  approval_days: Number(e.target.value) || null,
                })
              }
              className="h-8 w-20 bg-muted rounded-lg px-3 text-xs outline-none"
            />
          </div>
        </div>
      </div>

      {/* Produktversand */}
      <div>
        <SectionLabel>Produktversand</SectionLabel>
        <div className="rounded-xl border border-border-light p-4 flex flex-col gap-3">
          {productWarning && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 text-amber-700 text-xs font-medium">
              <Package className="size-3.5 shrink-0" />
              Produkt noch nicht erhalten – Draft-Deadline in ≤7 Tagen!
            </div>
          )}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground">
              Lieferadresse
            </span>
            <textarea
              value={delivery_info?.address ?? ""}
              onChange={(e) =>
                patchDelivery({ address: e.target.value || null })
              }
              rows={2}
              placeholder="Straße, PLZ Ort…"
              className="bg-muted rounded-lg px-3 py-2 text-xs outline-none resize-none"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-[10px] text-muted-foreground">
                Tracking-Nummer
              </span>
              <input
                type="text"
                value={delivery_info?.tracking_number ?? ""}
                onChange={(e) =>
                  patchDelivery({ tracking_number: e.target.value || null })
                }
                placeholder="123ABC…"
                className="h-8 bg-muted rounded-lg px-3 text-xs outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground">Status</span>
              <select
                value={delivery_info?.status ?? "ausstehend"}
                onChange={(e) =>
                  patchDelivery({
                    status: e.target.value as DeliveryInfo["status"],
                  })
                }
                className="h-8 bg-muted rounded-lg px-3 text-xs outline-none cursor-pointer"
              >
                <option value="ausstehend">Ausstehend</option>
                <option value="versendet">Versendet</option>
                <option value="erhalten">Erhalten</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Vorgaben – read-only */}
      <Collapsible title="Vorgaben">
        <div className="flex flex-col gap-3 mt-3">
          {[
            { label: "Labeling / Kennzeichnung", value: guidelines?.labeling },
            { label: "Wording", value: guidelines?.wording },
            { label: "No-Gos", value: guidelines?.nogo },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground">{label}</span>
              <p className="text-xs text-foreground whitespace-pre-wrap">
                {value || <span className="text-muted-foreground">—</span>}
              </p>
            </div>
          ))}
          {(guidelines?.hashtags ?? []).length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground">
                Hashtags
              </span>
              <div className="flex flex-wrap gap-1">
                {(guidelines?.hashtags ?? []).map((h) => (
                  <span
                    key={h}
                    className="rounded-full bg-muted px-2 py-0.5 text-xs"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}
          {(guidelines?.links ?? []).length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground">Links</span>
              <div className="flex flex-wrap gap-1">
                {(guidelines?.links ?? []).map((l) => (
                  <a
                    key={l}
                    href={l}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs hover:underline"
                  >
                    <ExternalLink className="size-3" />
                    {l}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </Collapsible>

      {/* Tracking-Assets – read-only */}
      <Collapsible title="Tracking-Assets">
        <div className="flex flex-col gap-3 mt-3">
          {(
            [
              {
                key: "discount_code" as const,
                label: "Rabattcode",
                icon: <Tag className="size-3.5" />,
              },
              {
                key: "affiliate_link" as const,
                label: "Affiliate-Link",
                icon: <Link2 className="size-3.5" />,
              },
              {
                key: "utm_params" as const,
                label: "UTM-Parameter",
                icon: <Copy className="size-3.5" />,
              },
            ] as const
          ).map(({ key, label, icon }) => (
            <div key={key} className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground">{label}</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 flex-1 h-8 bg-muted rounded-lg px-3">
                  <span className="text-muted-foreground shrink-0">{icon}</span>
                  <span className="flex-1 text-xs truncate">
                    {tracking_assets?.[key] ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </span>
                </div>
                {tracking_assets?.[key] && (
                  <CopyButton value={tracking_assets[key] as string} />
                )}
              </div>
            </div>
          ))}
        </div>
      </Collapsible>
    </div>
  );
}

// ── Tab 3: Rechte und Konditionen ─────────────────────────────────────────────

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function RechteTab({
  local,
}: {
  local: LocalState;
  patchLocal?: (patch: Partial<LocalState>) => void;
}) {
  const rights = local.rights;

  const expiryDate = computeExpiry(rights, local.campaign_start);
  const daysRemaining = expiryDate ? daysUntil(expiryDate) : null;
  const hasPaidSocial = (rights.channels ?? []).includes(
    "Paid Social (Whitelisting/Spark)",
  );

  const scopeLabel =
    rights.scope === "nur_gepostet"
      ? "nur gepostetes Asset"
      : rights.scope === "inkl_rohmaterial"
        ? "inklusive Rohmaterial"
        : null;

  const startLabel =
    rights.duration_start_type === "live_gang"
      ? "ab Live-Gang"
      : rights.duration_start_type === "kampagnenstart"
        ? "ab Kampagnenstart"
        : null;
  const startDateForLabel =
    rights.duration_start_type === "live_gang"
      ? rights.live_gang_date
      : rights.duration_start_type === "kampagnenstart"
        ? local.campaign_start
        : null;

  return (
    <div className="flex flex-col gap-5">
      {/* Nutzungsrechte card */}
      <div>
        <SectionLabel>Nutzungsrechte</SectionLabel>
        <div className="rounded-xl border border-border-light p-5 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-6">
            <InfoRow label="Umfang">
              {scopeLabel ? (
                <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-medium">
                  {scopeLabel}
                </span>
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )}
            </InfoRow>
            <InfoRow label="Territorium">
              {rights.territory ? (
                <div className="flex flex-col gap-1">
                  <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-medium w-fit">
                    {rights.territory}
                  </span>
                  {rights.territory === "individuell" &&
                    rights.territory_custom && (
                      <span className="text-xs text-muted-foreground">
                        {rights.territory_custom}
                      </span>
                    )}
                </div>
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )}
            </InfoRow>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <InfoRow label="Laufzeit">
              {rights.duration_value ? (
                <span className="text-sm font-medium">
                  {rights.duration_value}{" "}
                  {rights.duration_unit === "wochen" ? "Wochen" : "Monate"}
                </span>
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )}
            </InfoRow>
            <InfoRow label="Beginn der Laufzeit">
              {startLabel ? (
                <div className="flex flex-col gap-0.5">
                  <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-medium w-fit">
                    {startLabel}
                  </span>
                  {startDateForLabel && (
                    <span className="text-xs text-muted-foreground">
                      {fmtDE(startDateForLabel)}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )}
            </InfoRow>
          </div>

          <InfoRow label="Freigegebene Kanäle">
            {(rights.channels ?? []).length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-0.5">
                {(rights.channels ?? []).map((ch) => (
                  <span
                    key={ch}
                    className="inline-flex items-center gap-1.5 rounded-full border border-foreground bg-foreground text-background px-3 py-1 text-xs font-medium"
                  >
                    <span className="size-3.5 rounded-full border-2 border-background bg-background flex items-center justify-center shrink-0">
                      <Check
                        className="size-2"
                        strokeWidth={3}
                        style={{ color: "hsl(var(--foreground))" }}
                      />
                    </span>
                    {ch}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground text-xs">
                Keine Kanäle hinterlegt
              </span>
            )}
          </InfoRow>

          {/* Ablaufdatum — computed */}
          {expiryDate && (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/60 border border-border-light">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Ablaufdatum
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xl font-bold tabular-nums">
                    {fmtDE(expiryDate)}
                  </span>
                  {daysRemaining !== null && (
                    <span
                      className={cn(
                        "text-[10px] rounded-full px-2 py-0.5 font-semibold",
                        daysRemaining < 0
                          ? "bg-red-500/10 text-red-600"
                          : daysRemaining < 30
                            ? "bg-amber-500/10 text-amber-700"
                            : "bg-green-500/10 text-green-700",
                      )}
                    >
                      {daysRemaining < 0
                        ? "abgelaufen"
                        : `in ${daysRemaining} Tagen`}
                    </span>
                  )}
                </div>
              </div>
              {startLabel && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    automatisch · {rights.duration_value}{" "}
                    {rights.duration_unit === "wochen" ? "Wochen" : "Monate"}{" "}
                    {startLabel}
                  </p>
                  {startDateForLabel && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fmtDE(startDateForLabel)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Details collapsible */}
      <Collapsible title="Details – Bearbeitungsrecht, Übertragbarkeit, Verlängerungsoption">
        <div className="flex flex-col gap-4 mt-3">
          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium">Bearbeitungsrechte</span>
              {[
                "Schnitt & Montage",
                "Farbkorrektur",
                "Text & Overlay",
                "Formatanpassung",
              ].map((m) => (
                <div key={m} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    readOnly
                    checked={(rights.modifications ?? []).includes(m)}
                    className="rounded border-border pointer-events-none"
                  />
                  <span
                    className={cn(
                      "text-xs",
                      (rights.modifications ?? []).includes(m)
                        ? ""
                        : "text-muted-foreground",
                    )}
                  >
                    {m}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium">Weitergabe</span>
              {[
                "Unterlizenzierung",
                "Agenturweitergabe",
                "Konzernweitergabe",
                "Sublizenz an Händler",
              ].map((t) => (
                <div key={t} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    readOnly
                    checked={(rights.transferability ?? []).includes(t)}
                    className="rounded border-border pointer-events-none"
                  />
                  <span
                    className={cn(
                      "text-xs",
                      (rights.transferability ?? []).includes(t)
                        ? ""
                        : "text-muted-foreground",
                    )}
                  >
                    {t}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {rights.extension?.duration_value && (
            <div className="flex flex-col gap-2 pt-3 border-t border-border-light">
              <span className="text-xs font-medium">Verlängerungsoption</span>
              <div className="flex flex-wrap gap-4 text-xs">
                <span>
                  {rights.extension.duration_value}{" "}
                  {rights.extension.duration_unit === "wochen"
                    ? "Wochen"
                    : "Monate"}
                </span>
                {rights.extension.price != null && (
                  <span>{fmtMoney(rights.extension.price)}</span>
                )}
                {rights.extension.deadline && (
                  <span>Deadline: {fmtDE(rights.extension.deadline)}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </Collapsible>

      {/* Exklusivität + Sperrfrist */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-border-light p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold">Exklusivität</p>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground">
              Branche / Kategorie
            </span>
            <p className="text-xs">
              {local.exclusivity_info?.category || (
                <span className="text-muted-foreground">—</span>
              )}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground">Bis</span>
            <p className="text-xs">
              {local.exclusivity_info?.end_date ? (
                fmtDE(local.exclusivity_info.end_date)
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </p>
          </div>
          {(local.exclusivity_info?.competitors ?? []).length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground">
                Wettbewerber
              </span>
              <div className="flex flex-wrap gap-1">
                {(local.exclusivity_info?.competitors ?? []).map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-muted px-2 py-0.5 text-xs"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border-light p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold">Sperrfrist</p>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground">Posten ab</span>
            <p className="text-xs">
              {local.embargo?.date ? (
                fmtDE(local.embargo.date)
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </p>
          </div>
          {local.embargo?.notes && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground">
                Hinweise
              </span>
              <p className="text-xs whitespace-pre-wrap">
                {local.embargo.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Whitelisting / Spark */}
      {hasPaidSocial && (
        <div>
          <SectionLabel>Whitelisting / Spark</SectionLabel>
          <div className="rounded-xl border border-border-light p-4 grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground">
                TikTok Spark Ablauf
              </span>
              <p className="text-xs">
                {local.whitelisting?.spark_expiry ? (
                  fmtDE(local.whitelisting.spark_expiry)
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground">
                Meta Business Manager Ablauf
              </span>
              <p className="text-xs">
                {local.whitelisting?.meta_expiry ? (
                  fmtDE(local.whitelisting.meta_expiry)
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 4: Geld ───────────────────────────────────────────────────────────────

function GeldTab({
  local,
  deal,
  patchLocal,
}: {
  local: LocalState;
  deal: DealFull;
  patchLocal: (patch: Partial<LocalState>) => void;
}) {
  const [payLoading, setPayLoading] = useState<number | null>(null);

  function patchPayItem(index: number, patch: Partial<PaymentItem>) {
    patchLocal({
      payment_items: local.payment_items.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    });
  }

  async function markAsPaid(index: number) {
    if (payLoading !== null) return;
    setPayLoading(index);
    const today = new Date().toISOString().split("T")[0];
    const updated = local.payment_items.map((item, i) =>
      i === index ? { ...item, paid_at: today } : item,
    );
    patchLocal({ payment_items: updated });
    try {
      await fetch(`/api/deals/${deal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_items: updated }),
      });
    } finally {
      setPayLoading(null);
    }
  }

  const items = local.payment_items;
  const totalBudget =
    items.reduce((sum, i) => sum + (i.amount ?? 0), 0) || local.budget;

  return (
    <div className="flex flex-col gap-5">
      {totalBudget > 0 && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/50 border border-border-light">
          <span className="text-sm font-medium text-muted-foreground">
            Gesamtbetrag
          </span>
          <span className="text-lg font-bold tabular-nums">
            {fmtMoney(totalBudget)}
          </span>
        </div>
      )}

      {items.length > 0 ? (
        <div className="rounded-xl border border-border-light overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/30 border-b border-border-light">
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
              {items.map((item, i) => {
                const ps = getPayStatus(item);
                return (
                  <tr
                    key={i}
                    className={cn(
                      ps.overdue && !item.paid_at && "bg-red-500/5",
                    )}
                  >
                    <td className="px-3 py-3">
                      <span className="font-medium text-sm">
                        {item.label || "Zahlung"}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-medium tabular-nums">
                      {item.amount > 0 ? fmtMoney(item.amount) : <Empty />}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          size="sm"
                          checked={!!item.invoice_date}
                          onCheckedChange={(checked) => {
                            const today = new Date()
                              .toISOString()
                              .split("T")[0];
                            patchPayItem(i, {
                              invoice_date: checked ? today : "",
                            });
                          }}
                        />
                        {item.invoice_date && (
                          <input
                            type="date"
                            value={item.invoice_date}
                            onChange={(e) =>
                              patchPayItem(i, { invoice_date: e.target.value })
                            }
                            className="h-7 bg-muted rounded-lg px-2 text-xs outline-none"
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      <select
                        value={item.payment_term}
                        onChange={(e) =>
                          patchPayItem(i, {
                            payment_term: Number(
                              e.target.value,
                            ) as PaymentItem["payment_term"],
                          })
                        }
                        className="bg-muted rounded px-2 py-1 text-xs outline-none cursor-pointer"
                      >
                        <option value={14}>14 Tage</option>
                        <option value={30}>30 Tage</option>
                        <option value={45}>45 Tage</option>
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      {ps.dueDate ? (
                        <span
                          className={cn(
                            "font-medium",
                            ps.overdue && !item.paid_at ? "text-red-600" : "",
                          )}
                        >
                          {fmtShort(ps.dueDate)}
                        </span>
                      ) : (
                        <Empty />
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {item.paid_at ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            Bezahlt
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {fmtShort(item.paid_at)}
                          </span>
                        </div>
                      ) : item.invoice_date ? (
                        <div className="flex flex-col items-start gap-1.5">
                          {ps.overdue ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                              Überfällig ({ps.daysOverdue}T)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              Offen
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
      ) : (
        <div className="rounded-xl border border-border-light p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Keine Zahlungsposten hinterlegt
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main Dialog ───────────────────────────────────────────────────────────────

interface DealDialogProps {
  deal: DealFull | null;
  creatorName?: string;
  open: boolean;
  onClose: () => void;
}

function DealDialogContent({
  deal,
  creatorName,
  onClose,
}: {
  deal: DealFull;
  creatorName?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [local, setLocal] = useState<LocalState>(() => buildLocalState(deal));
  const [isDirty, setIsDirty] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  function patchLocal(patch: Partial<LocalState>) {
    setLocal((prev) => ({ ...prev, ...patch }));
    setIsDirty(true);
  }

  async function handleStatusChange(newStatus: string) {
    if (statusLoading || newStatus === local.status) return;
    setStatusLoading(true);
    setLocal((prev) => ({ ...prev, status: newStatus }));
    try {
      await fetch(`/api/deals/${deal!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } finally {
      setStatusLoading(false);
    }
  }

  async function handleSave() {
    setSaveLoading(true);
    try {
      await fetch(`/api/deals/${deal!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: local.title,
          contact_person: local.contact_person || null,
          description: local.description || null,
          deliverables: local.deliverables,
          payment_items: local.payment_items,
          campaign_start: local.campaign_start || null,
          campaign_end: local.campaign_end || null,
          contract_status: local.contract_status,
          contract_date: local.contract_date || null,
          contract_url: local.contract_url || null,
          rights: local.rights,
          approval_info: local.approval_info,
          delivery_info: local.delivery_info,
          guidelines: local.guidelines,
          tracking_assets: local.tracking_assets,
          exclusivity_info: local.exclusivity_info,
          embargo: local.embargo,
          whitelisting: local.whitelisting,
        }),
      });
      router.refresh();
      setIsDirty(false);
    } finally {
      setSaveLoading(false);
    }
  }

  const subtitleParts = [deal.brands?.company_name, creatorName].filter(
    Boolean,
  );

  const isPipeline = PIPELINE.has(local.status);
  const isLaufend = LAUFEND.has(local.status);
  const isAbgeschlossen = ALT.has(local.status);

  return (
    <div className="flex flex-col max-h-[90vh]">
      {/* Header */}
      <div className="px-6 pt-5 pb-4  shrink-0">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            {deal.brands && <BrandAvatar brand={deal.brands} size="md" />}
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold leading-tight">
                {local.title || deal.title}
              </DialogTitle>
              {subtitleParts.length > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {subtitleParts.join(" · ")}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <X className="size-4" />
          </button>
        </div>
        <DealStepper
          status={local.status}
          loading={statusLoading}
          onStageClick={handleStatusChange}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="uebersicht" className="flex-1 min-h-0 flex flex-col">
        <div className="px-6  shrink-0">
          <TabsList variant="underline">
            <TabsTrigger value="uebersicht">Überblick</TabsTrigger>
            <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
            <TabsTrigger value="rechte">Rechte & Konditionen</TabsTrigger>
            <TabsTrigger value="geld">Geld</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
          <TabsContent value="uebersicht" className="mt-0">
            <UeberblickTab local={local} patchLocal={patchLocal} />
          </TabsContent>
          <TabsContent value="deliverables" className="mt-0">
            <DeliverablesTab local={local} patchLocal={patchLocal} />
          </TabsContent>
          <TabsContent value="rechte" className="mt-0">
            <RechteTab local={local} />
          </TabsContent>
          <TabsContent value="geld" className="mt-0">
            <GeldTab local={local} deal={deal} patchLocal={patchLocal} />
          </TabsContent>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-light bg-muted/30 shrink-0 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Erstellt am {fmtDE(deal.created_at.split("T")[0])}
          </span>
          <div className="flex items-center gap-2">
            {!isDirty && isPipeline && (
              <Button
                disabled={statusLoading}
                onClick={() => handleStatusChange("confirmed")}
              >
                Deal starten
              </Button>
            )}
            {!isDirty && isLaufend && (
              <Button
                disabled={statusLoading}
                onClick={() => handleStatusChange("paid")}
              >
                Deal abschließen → Archiv
              </Button>
            )}
            {!isDirty && isAbgeschlossen && (
              <span className="text-xs text-muted-foreground">
                Deal abgeschlossen
              </span>
            )}
            {isDirty && (
              <Button onClick={handleSave} disabled={saveLoading}>
                {saveLoading ? "Speichern…" : "Speichern"}
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Schließen
            </Button>
          </div>
        </div>
      </Tabs>
    </div>
  );
}

export function DealDialog({
  deal,
  creatorName,
  open,
  onClose,
}: DealDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent
        className="max-w-5xl sm:max-w-5xl p-0 gap-0 overflow-hidden"
        showCloseButton={false}
      >
        {deal && (
          <DealDialogContent
            key={deal.id}
            deal={deal}
            creatorName={creatorName}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
