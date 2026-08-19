import type {
  CreatorAccount,
  MetricsCurrent,
  MetricsDaily,
} from "@/domains/social-accounts/types";

export type {
  Deliverable,
  DealRights,
  ApprovalInfo,
  DeliveryInfo,
  DealGuidelines,
  TrackingAssets,
  ExclusivityInfo,
  Embargo,
  WhitelistingInfo,
  PaymentItem,
  DealFull,
} from "@/domains/deals";

export type MetricsResponse = {
  accounts: CreatorAccount[];
  metrics: Record<
    string,
    { current: MetricsCurrent | null; daily: MetricsDaily[] }
  >;
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
