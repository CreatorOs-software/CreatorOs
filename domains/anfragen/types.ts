export type AnfrageStatus =
  | "neu"
  | "pruefung"
  | "angebot"
  | "verhandlung"
  | "zugesagt"
  | "gewonnen"
  | "abgelehnt";

export type AnfrageSource = "email" | "ig_dm" | "whatsapp" | "manual";

export type AnfrageDeliverable = {
  count: number;
  content_type: string;
  platform: string;
  draft_deadline?: string | null;
  freigabe_deadline?: string | null;
  live_date?: string | null;
  rights?: Record<string, unknown> | null;
  exclusivity_info?: Record<string, unknown> | null;
  embargo?: Record<string, unknown> | null;
};

export type AnfragePaymentItem = {
  label: string;
  amount: number;
  invoice_date: string;
  payment_term: 14 | 30 | 45;
  paid_at?: string;
};

export type AnfrageGuidelines = {
  labeling?: string;
  wording?: string;
  nogo?: string;
  hashtags?: string[];
};

export type AnfrageTrackingAssets = {
  discount_code?: string;
  affiliate_links?: string[];
  utm_params?: string;
};

export type Anfrage = {
  id: string;
  creator_id: string;
  brand_id: string | null;
  brand_name: string | null;
  contact_person: string | null;
  title: string | null;
  product: string | null;
  campaign_start: string | null;
  campaign_end: string | null;
  deliverables: AnfrageDeliverable[];
  payment_items: AnfragePaymentItem[];
  fee: number | null;
  format: string | null;
  budget_requested: number | null;
  budget_offer: number | null;
  guidelines: AnfrageGuidelines | null;
  tracking_assets: AnfrageTrackingAssets | null;
  source: AnfrageSource;
  status: AnfrageStatus;
  rejection_reason: string | null;
  notes: string | null;
  linked_deal_id: string | null;
  created_at: string;
  updated_at: string;
  brands: {
    company_name: string;
    short_code: string;
    contact_name: string | null;
    contact_email: string | null;
  } | null;
};

export type AnfragePatch = {
  brand_id?: string | null;
  brand_name?: string | null;
  contact_person?: string | null;
  title?: string | null;
  product?: string | null;
  campaign_start?: string | null;
  campaign_end?: string | null;
  deliverables?: AnfrageDeliverable[];
  payment_items?: AnfragePaymentItem[];
  fee?: number | null;
  format?: string | null;
  budget_requested?: number | null;
  budget_offer?: number | null;
  guidelines?: AnfrageGuidelines | null;
  tracking_assets?: AnfrageTrackingAssets | null;
  source?: AnfrageSource;
  status?: AnfrageStatus;
  rejection_reason?: string | null;
  notes?: string | null;
};

export type AnfrageCreateInput = {
  creator_id: string;
  brand_id?: string | null;
  brand_name?: string | null;
  contact_person?: string | null;
  title?: string | null;
  product?: string | null;
  campaign_start?: string | null;
  campaign_end?: string | null;
  deliverables?: AnfrageDeliverable[];
  payment_items?: AnfragePaymentItem[];
  fee?: number | null;
  format?: string | null;
  budget_requested?: number | null;
  budget_offer?: number | null;
  guidelines?: AnfrageGuidelines | null;
  tracking_assets?: AnfrageTrackingAssets | null;
  source: AnfrageSource;
  notes?: string | null;
};
