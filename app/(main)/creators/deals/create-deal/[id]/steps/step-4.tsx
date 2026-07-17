"use client";

import type { DealFormValues, PaymentItem } from "../deal-form.schema";
import type { BrandOption, CreatorOption } from "../deal-form.types";
import { StepNav } from "@/app/(main)/creators/create-form/steps/step-nav";

// ── Formatting helpers ───────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDE(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function getPaymentStatus(invoice_date: string, payment_term: number) {
  if (!invoice_date) return null;
  const dueDate = addDays(invoice_date, payment_term);
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

// ── Reusable layout primitives ───────────────────────────────

function SectionCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border-light overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border-light bg-muted/30">
        <h3 className="text-sm font-semibold">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs text-primary hover:underline underline-offset-4"
        >
          Bearbeiten
        </button>
      </div>
      <dl className="px-5 divide-y divide-border-light">{children}</dl>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 py-3">
      <dt className="w-36 shrink-0 text-xs text-muted-foreground leading-5">
        {label}
      </dt>
      <dd className="flex-1 text-sm">{children}</dd>
    </div>
  );
}

function Empty() {
  return <span className="text-muted-foreground/40">—</span>;
}

// ── Payment card used in the Zahlung summary ─────────────────

function PaymentSummaryCard({ item }: { item: PaymentItem }) {
  const status = item.invoice_date
    ? getPaymentStatus(item.invoice_date, item.payment_term)
    : null;

  return (
    <div className="rounded-lg border border-border-light bg-background p-3.5 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs text-muted-foreground">{item.label || "Zahlung"}</span>
        <span className="text-sm font-semibold shrink-0">
          {item.amount > 0 ? formatCurrency(item.amount) : <Empty />}
        </span>
      </div>

      {item.invoice_date ? (
        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          <span>Rechnung: {formatDE(item.invoice_date)}</span>
          {status && <span>Fällig: {formatDE(status.dueDate)}</span>}
        </div>
      ) : (
        <span className="text-xs text-muted-foreground/50">
          Noch nicht gestellt
        </span>
      )}

      {status && (
        status.overdue ? (
          <span className="self-start inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-0.5 text-[11px] font-medium text-destructive">
            <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
            Überfällig seit {status.daysOverdue}{" "}
            {status.daysOverdue === 1 ? "Tag" : "Tagen"}
          </span>
        ) : (
          <span className="self-start inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
            Offen
          </span>
        )
      )}
    </div>
  );
}

// ── Step 4 ───────────────────────────────────────────────────

interface Step4Props {
  values: DealFormValues;
  brands: BrandOption[];
  creators: CreatorOption[];
  images: File[];
  saving: boolean;
  error: string | null;
  onPrev: () => void;
  onSubmit: () => void;
  onGoToStep: (step: number) => void;
}

export function Step4({
  values,
  brands,
  creators,
  images,
  saving,
  error,
  onPrev,
  onSubmit,
  onGoToStep,
}: Step4Props) {
  const brand = brands.find((b) => b.id === values.brand_id);
  const creator = creators.find((c) => c.id === values.creator_id);

  return (
    <div className="flex flex-col gap-0">
      <div className="flex flex-col gap-3">
        {/* ── Basisdaten ──────────────────────────────────── */}
        <SectionCard title="Basisdaten" onEdit={() => onGoToStep(1)}>
          <Row label="Kampagnen-Titel">
            {values.title ? (
              <span className="font-medium">{values.title}</span>
            ) : (
              <Empty />
            )}
          </Row>
          <Row label="Brand">
            {brand ? (
              <span className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ background: brand.color }}
                />
                {brand.company_name}
              </span>
            ) : (
              <Empty />
            )}
          </Row>
          <Row label="Produkt">{values.product || <Empty />}</Row>
          <Row label="Plattform">{values.platform || <Empty />}</Row>
          <Row label="Creator">
            {creator ? (
              <span className="flex items-center gap-2">
                <span
                  className="w-5 h-5 rounded-md shrink-0 inline-flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: creator.color }}
                >
                  {creator.initials}
                </span>
                {creator.full_name}
              </span>
            ) : (
              <Empty />
            )}
          </Row>
        </SectionCard>

        {/* ── Rahmendaten ─────────────────────────────────── */}
        <SectionCard title="Rahmendaten" onEdit={() => onGoToStep(2)}>
          <Row label="Ansprechpartner">
            {values.contact_person || <Empty />}
          </Row>
          <Row label="Deliverables">
            {values.deliverables.length === 0 ? (
              <Empty />
            ) : (
              <ul className="flex flex-col gap-0.5">
                {values.deliverables.map((d, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium">{d.count}×</span>{" "}
                    {d.content_type}
                    <span className="text-muted-foreground"> · {d.platform}</span>
                  </li>
                ))}
              </ul>
            )}
          </Row>
          <Row label="Deadline">
            {values.deadline ? formatDE(values.deadline) : <Empty />}
          </Row>
          <Row label="Nutzungsrechte">
            {values.usage_rights || <Empty />}
          </Row>
          <Row label="Exklusivität">{values.exclusivity || <Empty />}</Row>
          {values.notes && (
            <Row label="Notizen">
              <span className="whitespace-pre-wrap break-words text-sm">
                {values.notes}
              </span>
            </Row>
          )}
          <Row label="Bilder">
            {images.length > 0 ? (
              <span>
                {images.length} Bild{images.length !== 1 ? "er" : ""}
              </span>
            ) : (
              <Empty />
            )}
          </Row>
        </SectionCard>

        {/* ── Zahlung ─────────────────────────────────────── */}
        <SectionCard title="Zahlung" onEdit={() => onGoToStep(3)}>
          <Row label="Gesamthonorar">
            {values.fee > 0 ? (
              <span className="font-medium">{formatCurrency(values.fee)}</span>
            ) : (
              <Empty />
            )}
          </Row>
          <Row
            label={
              values.payment_items.length > 1 ? "Zahlungsposten" : "Zahlung"
            }
          >
            <div
              className={`grid gap-2 ${values.payment_items.length > 1 ? "grid-cols-2" : "grid-cols-1 max-w-xs"}`}
            >
              {values.payment_items.map((item, i) => (
                <PaymentSummaryCard key={i} item={item} />
              ))}
            </div>
          </Row>
        </SectionCard>
      </div>

      {error && (
        <p className="mt-4 text-xs text-destructive text-center">{error}</p>
      )}

      <StepNav
        onPrev={onPrev}
        onSubmit={onSubmit}
        saving={saving}
        submitLabel="Deal anlegen"
      />
    </div>
  );
}
