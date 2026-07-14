import type { DealFormValues } from "./deal-form.schema";

export const STEPS = [
  { id: 1, label: "Basisdaten" },
  { id: 2, label: "Rahmendaten" },
  { id: 3, label: "Zahlung" },
  { id: 4, label: "Prüfen" },
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
    // Step 1
    title: "",
    brand_id: "",
    product: "",
    platform: "",
    creator_id: creatorId,
    // Step 2
    contact_person: "",
    deliverables: [],
    deadline: "",
    usage_rights: "",
    exclusivity: "",
    notes: "",
    // Step 3
    fee: 0,
    payment_items: [
      { label: "Zahlung", amount: 0, invoice_date: "", payment_term: 30 },
    ],
  };
}
