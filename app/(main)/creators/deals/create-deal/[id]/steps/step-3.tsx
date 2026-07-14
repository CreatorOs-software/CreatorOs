"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PAYMENT_TERMS } from "../deal-form.constants";
import type { PaymentItem, PaymentTerm } from "../deal-form.schema";
import type { DealForm, DealField, StepErrors } from "../deal-form.types";
import { StepNav } from "@/app/(main)/creators/create-form/steps/step-nav";

// ── Helpers ─────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatDE(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

type PaymentStatus =
  | { kind: "uninvoiced" }
  | { kind: "open"; dueDate: string }
  | { kind: "overdue"; dueDate: string; daysOverdue: number };

function getStatus(invoice_date: string, payment_term: number): PaymentStatus {
  if (!invoice_date) return { kind: "uninvoiced" };
  const dueDate = addDays(invoice_date, payment_term);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  if (due < today) {
    const daysOverdue = Math.floor(
      (today.getTime() - due.getTime()) / 86_400_000,
    );
    return { kind: "overdue", dueDate, daysOverdue };
  }
  return { kind: "open", dueDate };
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  if (status.kind === "uninvoiced") return null;
  if (status.kind === "overdue") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
        <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
        Überfällig seit {status.daysOverdue}{" "}
        {status.daysOverdue === 1 ? "Tag" : "Tagen"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
      Offen
    </span>
  );
}

// ── PaymentCard ──────────────────────────────────────────────

interface PaymentCardProps {
  item: PaymentItem;
  onUpdate: (patch: Partial<PaymentItem>) => void;
}

function PaymentCard({ item, onUpdate }: PaymentCardProps) {
  const status = getStatus(item.invoice_date, item.payment_term);
  const invoiced = item.invoice_date !== "";

  return (
    <div className="rounded-xl border border-border-light bg-muted/30 p-4 flex flex-col gap-4">
      {/* Label + Amount */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Bezeichnung</Label>
          <Input
            value={item.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            placeholder="z.B. Anzahlung"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Betrag (€)</Label>
          <Input
            type="number"
            min={0}
            value={item.amount === 0 ? "" : item.amount}
            onChange={(e) =>
              onUpdate({
                amount: e.target.value === "" ? 0 : Number(e.target.value),
              })
            }
            placeholder="0"
            className="mt-1.5"
          />
        </div>
      </div>

      {/* Invoice toggle + Payment term */}
      <div className="grid grid-cols-2 gap-3 items-start">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <Switch
              checked={invoiced}
              onCheckedChange={(checked) =>
                onUpdate({
                  invoice_date: checked
                    ? new Date().toISOString().split("T")[0]
                    : "",
                })
              }
            />
            <Label className="text-sm cursor-pointer select-none">
              Rechnung gestellt
            </Label>
          </div>
          {invoiced && (
            <Input
              type="date"
              value={item.invoice_date}
              onChange={(e) => onUpdate({ invoice_date: e.target.value })}
            />
          )}
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Zahlungsziel</Label>
          <Select
            value={String(item.payment_term)}
            onValueChange={(val) =>
              onUpdate({ payment_term: Number(val) as PaymentTerm })
            }
          >
            <SelectTrigger className="mt-1.5 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_TERMS.map((t) => (
                <SelectItem key={t.value} value={String(t.value)}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Calculated row — only visible once invoiced */}
      {invoiced && (
        <div className="flex items-center justify-between pt-3 border-t border-border-light">
          <span className="text-xs text-muted-foreground">
            Fällig am{" "}
            <span className="text-foreground font-medium">
              {status.kind !== "uninvoiced" ? formatDE(status.dueDate) : "—"}
            </span>
          </span>
          <StatusBadge status={status} />
        </div>
      )}
    </div>
  );
}

// ── Step 3 ───────────────────────────────────────────────────

interface Step3Props {
  form: DealForm;
  errors: StepErrors;
  onNext: () => void;
  onPrev: () => void;
}

export function Step3({ form, errors, onNext, onPrev }: Step3Props) {
  return (
    <div className="flex flex-col gap-0">
      {/* ── Honorar ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <div>
          <h2 className="font-semibold text-foreground">Honorar</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Gesamtvergütung und Zahlungsstruktur.
          </p>
        </div>

        <div className="sm:col-span-2">
          <div className="flex flex-col gap-5">
            {/* Fee */}
            <form.Field name="fee">
              {(field: DealField<"fee">) => (
                <div className="sm:w-48">
                  <Label htmlFor="fee" className="text-sm font-medium">
                    Gesamthonorar (€)
                  </Label>
                  <Input
                    id="fee"
                    type="number"
                    min={0}
                    placeholder="0"
                    value={(field.state.value as number) === 0 ? "" : field.state.value}
                    onChange={(e) =>
                      field.handleChange(
                        e.target.value === "" ? 0 : Number(e.target.value),
                      )
                    }
                    className="mt-2"
                  />
                  {errors.fee && (
                    <p className="mt-1.5 text-xs text-destructive">{errors.fee}</p>
                  )}
                </div>
              )}
            </form.Field>

            {/* Split toggle — lives inside payment_items field so it can update the array */}
            <form.Field name="payment_items">
              {(field: DealField<"payment_items">) => {
                const items = (field.state.value ?? []) as PaymentItem[];
                const isSplit = items.length >= 2;

                function toggleSplit(checked: boolean) {
                  const fee = (form.state.values.fee as number) ?? 0;
                  if (checked) {
                    const half = Math.round(fee / 2);
                    field.handleChange([
                      { ...items[0], label: "Anzahlung", amount: half },
                      {
                        label: "Restbetrag",
                        amount: fee - half,
                        invoice_date: "",
                        payment_term: 30 as const,
                      },
                    ]);
                  } else {
                    field.handleChange([
                      { ...items[0], label: "Zahlung", amount: fee },
                    ]);
                  }
                }

                function updateItem(index: number, patch: Partial<PaymentItem>) {
                  field.handleChange(
                    items.map((item, i) =>
                      i === index ? { ...item, ...patch } : item,
                    ),
                  );
                }

                return (
                  <div className="flex flex-col gap-4">
                    {/* Split toggle */}
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={isSplit}
                        onCheckedChange={toggleSplit}
                      />
                      <div>
                        <Label className="text-sm font-medium cursor-pointer select-none">
                          Zwei Zahlungsposten
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          z.B. 50 % Anzahlung + 50 % nach Livegang
                        </p>
                      </div>
                    </div>

                    {/* Payment cards */}
                    {items.map((item, i) => (
                      <div key={i}>
                        {isSplit && (
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Posten {i + 1}
                          </p>
                        )}
                        <PaymentCard
                          item={item}
                          onUpdate={(patch) => updateItem(i, patch)}
                        />
                      </div>
                    ))}
                  </div>
                );
              }}
            </form.Field>
          </div>
        </div>
      </div>

      <StepNav onPrev={onPrev} onNext={onNext} submitLabel="Deal anlegen" />
    </div>
  );
}
