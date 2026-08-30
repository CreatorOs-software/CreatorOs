"use client";

import { StepNav } from "@/app/(main)/creators/create-form/steps/step-nav";
import { SOURCE_LABEL, parseMoney } from "../anfrage-form.constants";
import type { AnfrageFormValues, AnfrageExtras } from "../anfrage-form.schema";
import type { BrandOption } from "../anfrage-form.types";

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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 py-3">
      <dt className="w-36 shrink-0 text-xs text-muted-foreground leading-5">{label}</dt>
      <dd className="flex-1 text-sm">{children}</dd>
    </div>
  );
}

function Empty() {
  return <span className="text-muted-foreground/40">—</span>;
}

interface StepPruefenProps {
  values: AnfrageFormValues;
  extras: AnfrageExtras;
  brands: BrandOption[];
  saving: boolean;
  error: string | null;
  submitLabel: string;
  onPrev: () => void;
  onSubmit: () => void;
  onGoToStep: (step: number) => void;
}

export function StepPruefen({
  values,
  extras,
  brands,
  saving,
  error,
  submitLabel,
  onPrev,
  onSubmit,
  onGoToStep,
}: StepPruefenProps) {
  const brand = brands.find((b) => b.id === values.brand_id);
  const brandName = brand?.company_name ?? extras.brand_name;
  const budgetRequested = parseMoney(extras.budget_requested);
  const budgetOffer = parseMoney(extras.budget_offer);
  const paymentTotal = values.payment_items.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="flex flex-col gap-0">
      <div className="flex flex-col gap-3">
        <SectionCard title="Anfrage" onEdit={() => onGoToStep(1)}>
          <Row label="Quelle">{SOURCE_LABEL[extras.source]}</Row>
          <Row label="Brand">
            {brand ? brand.company_name : brandName ? brandName : <Empty />}
          </Row>
          <Row label="Titel">{values.title || <Empty />}</Row>
          <Row label="Produkt">{values.product || <Empty />}</Row>
          <Row label="Ansprechpartner">{values.contact_person || <Empty />}</Row>
          <Row label="Zeitraum">
            {values.campaign_start || values.campaign_end ? (
              <span>
                {formatDE(values.campaign_start) || "?"} – {formatDE(values.campaign_end) || "?"}
              </span>
            ) : (
              <Empty />
            )}
          </Row>
          <Row label="Angefragtes Budget">
            {budgetRequested != null ? formatCurrency(budgetRequested) : <Empty />}
          </Row>
          <Row label="Unser Angebot">
            {budgetOffer != null ? formatCurrency(budgetOffer) : <Empty />}
          </Row>
        </SectionCard>

        <SectionCard title="Notizen & Tracking" onEdit={() => onGoToStep(2)}>
          <Row label="Notizen">
            {values.notes ? (
              <span className="whitespace-pre-wrap break-words">{values.notes}</span>
            ) : (
              <Empty />
            )}
          </Row>
          <Row label="Rabattcode">
            {(values.tracking_assets as { discount_code?: string } | undefined)?.discount_code || (
              <Empty />
            )}
          </Row>
        </SectionCard>

        <SectionCard title="Deliverables" onEdit={() => onGoToStep(3)}>
          <Row label="Deliverables">
            {values.deliverables.length === 0 ? (
              <Empty />
            ) : (
              <ul className="flex flex-col gap-0.5">
                {values.deliverables.map((d, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium">{d.count}×</span> {d.content_type}
                    <span className="text-muted-foreground"> · {d.platform}</span>
                  </li>
                ))}
              </ul>
            )}
          </Row>
        </SectionCard>

        <SectionCard title="Budget" onEdit={() => onGoToStep(4)}>
          <Row label="Gesamthonorar">
            {values.fee > 0 ? (
              <span className="font-medium">{formatCurrency(values.fee)}</span>
            ) : (
              <Empty />
            )}
          </Row>
          <Row label={values.payment_items.length > 1 ? "Zahlungsposten" : "Zahlung"}>
            {paymentTotal > 0 ? (
              <span>
                {values.payment_items.length}× · {formatCurrency(paymentTotal)}
              </span>
            ) : (
              <Empty />
            )}
          </Row>
        </SectionCard>
      </div>

      {error && <p className="mt-4 text-xs text-destructive text-center">{error}</p>}

      <StepNav
        onPrev={onPrev}
        onSubmit={onSubmit}
        saving={saving}
        submitLabel={submitLabel}
      />
    </div>
  );
}
