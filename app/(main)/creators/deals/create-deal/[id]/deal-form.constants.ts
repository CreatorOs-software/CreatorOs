import type { DealFormValues } from "./deal-form.schema";

export const STEPS = [
  { id: 1, label: "Basisdaten" },
  { id: 2, label: "Notizen & Tracking" },
  { id: 3, label: "Deliverables" },
  { id: 4, label: "Zahlung" },
  { id: 5, label: "Prüfen" },
];

export const PLATFORM_OPTIONS = [
  "Instagram",
  "TikTok",
  "YouTube",
  "Spotify",
  "OnlyFans",
  "X",
];

export const CONTENT_TYPE_OPTIONS = [
  "Reels",
  "Stories",
  "Foto / Post",
  "Video",
  "YouTube Short",
  "TikTok Video",
  "Podcast",
  "Blog Post",
];

export const PAYMENT_TERMS: { value: 14 | 30 | 45; label: string }[] = [
  { value: 14, label: "14 Tage" },
  { value: 30, label: "30 Tage" },
  { value: 45, label: "45 Tage" },
];

export function getInitialValues(creatorId: string): DealFormValues {
  return {
    // Step 1 – Basisdaten
    title: "",
    brand_id: "",
    product: "",
    creator_id: creatorId,
    // Step 1 – Rahmendaten
    contact_person: "",
    campaign_start: "",
    campaign_end: "",
    // Step 1 – Bearbeiter & Dokumente
    assignee_id: "",
    documents: [],
    // Step 2 – Notizen & Tracking
    notes: "",
    guidelines: {},
    tracking_assets: {},
    // Step 3 – Deliverables
    deliverables: [],
    // Step 4 – Zahlung
    fee: 0,
    payment_items: [
      { label: "Zahlung", amount: 0, invoice_date: "", payment_term: 30 },
    ],
    // Backwards compat (not shown in form)
    platform: "",
    deadline: "",
    usage_rights: "",
    exclusivity: "",
    rights: {},
    exclusivity_info: {},
    embargo: {},
    whitelisting: {},
    contract_status: "offen",
    contract_date: "",
    contract_url: "",
  };
}
