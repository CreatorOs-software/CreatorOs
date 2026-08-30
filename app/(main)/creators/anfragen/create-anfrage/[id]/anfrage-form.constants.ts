import { getInitialValues as getDealInitialValues } from "@/app/(main)/creators/deals/create-deal/[id]/deal-form.constants";
import type { AnfrageFormValues, AnfrageExtras } from "./anfrage-form.schema";
import type { AnfrageSource } from "@/domains/anfragen";

export const STEPS = [
  { id: 1, label: "Anfrage" },
  { id: 2, label: "Notizen & Tracking" },
  { id: 3, label: "Deliverables" },
  { id: 4, label: "Budget" },
  { id: 5, label: "Prüfen" },
];

export const SOURCE_OPTIONS: { value: AnfrageSource; label: string }[] = [
  { value: "email", label: "E-Mail" },
  { value: "ig_dm", label: "Instagram DM" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "manual", label: "Manuell" },
];

export const SOURCE_LABEL: Record<AnfrageSource, string> = {
  email: "E-Mail",
  ig_dm: "Instagram DM",
  whatsapp: "WhatsApp",
  manual: "Manuell",
};

export function getInitialValues(creatorId: string): AnfrageFormValues {
  return getDealInitialValues(creatorId);
}

export function getInitialExtras(): AnfrageExtras {
  return { source: "manual", brand_name: "", budget_requested: "", budget_offer: "" };
}

export function parseMoney(raw: string): number | null {
  if (!raw.trim()) return null;
  const n = parseFloat(raw.replace(",", "."));
  return isNaN(n) ? null : n;
}

export function buildAnfrageBody({
  values,
  extras,
}: {
  values: AnfrageFormValues;
  extras: AnfrageExtras;
}) {
  return {
    brand_id: values.brand_id || null,
    brand_name: values.brand_id ? null : extras.brand_name.trim() || null,
    contact_person: values.contact_person || null,
    title: values.title || null,
    product: values.product || null,
    campaign_start: values.campaign_start || null,
    campaign_end: values.campaign_end || null,
    deliverables: values.deliverables,
    payment_items: values.payment_items,
    fee: values.fee,
    budget_requested: parseMoney(extras.budget_requested),
    budget_offer: parseMoney(extras.budget_offer),
    guidelines: values.guidelines ?? null,
    tracking_assets: values.tracking_assets ?? null,
    source: extras.source,
    notes: values.notes || null,
  };
}
