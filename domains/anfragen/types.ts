export type AnfrageStatus =
  | "neu"
  | "pruefung"
  | "angebot"
  | "verhandlung"
  | "zugesagt"
  | "gewonnen"
  | "abgelehnt";

export type AnfrageSource = "email" | "ig_dm" | "whatsapp" | "manual";

export type Anfrage = {
  id: string;
  creator_id: string;
  brand_id: string | null;
  brand_name: string | null;
  contact_person: string | null;
  format: string | null;
  budget_requested: number | null;
  budget_offer: number | null;
  source: AnfrageSource;
  status: AnfrageStatus;
  rejection_reason: string | null;
  notes: string | null;
  linked_deal_id: string | null;
  created_at: string;
  updated_at: string;
  brands: {
    company_name: string;
    color: string;
    short_code: string;
    contact_name: string | null;
    contact_email: string | null;
  } | null;
};

export type AnfragePatch = {
  brand_id?: string | null;
  brand_name?: string | null;
  contact_person?: string | null;
  format?: string | null;
  budget_requested?: number | null;
  budget_offer?: number | null;
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
  format?: string | null;
  budget_requested?: number | null;
  budget_offer?: number | null;
  source: AnfrageSource;
  notes?: string | null;
};
