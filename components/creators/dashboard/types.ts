import type {
  CreatorAccount,
  MetricsCurrent,
  MetricsDaily,
} from "@/domains/social-accounts/types";

export type MetricsResponse = {
  accounts: CreatorAccount[];
  metrics: Record<
    string,
    { current: MetricsCurrent | null; daily: MetricsDaily[] }
  >;
};

export type Deliverable = {
  count: number;
  content_type: string;
  platform: string;
};

export type PaymentItem = {
  label: string;
  amount: number;
  invoice_date: string;
  payment_term: 14 | 30 | 45;
  paid_at?: string;
};

export type DealFull = {
  id: string;
  title: string;
  budget: number;
  status: string;
  priority: string;
  platform: string | null;
  brand_id: string | null;
  creator_id: string | null;
  deadline: string | null;
  campaign_type: string | null;
  deliverables: Deliverable[] | string[];
  description: string | null;
  product: string | null;
  contact_person: string | null;
  usage_rights: string | null;
  exclusivity: string | null;
  payment_items: PaymentItem[] | null;
  blocker: string | null;
  created_at: string;
  brands: {
    company_name: string;
    color: string;
    short_code: string;
    contact_name: string | null;
    contact_email: string | null;
  } | null;
};

export type Anfrage = {
  id: string;
  creator_id: string;
  brand_id: string | null;
  brand_name: string | null;
  contact_person: string | null;
  format: string | null;
  budget_requested: number | null;
  budget_offer: number | null;
  source: "email" | "ig_dm" | "whatsapp" | "manual";
  status: "neu" | "pruefung" | "angebot" | "verhandlung" | "zugesagt" | "gewonnen" | "abgelehnt";
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

export type Invoice = {
  id: string;
  number: string;
  amount: number;
  status: string;
  issued_at: string | null;
  due_date: string | null;
  paid_at: string | null;
  brands: { company_name: string; color: string; short_code: string } | null;
};
