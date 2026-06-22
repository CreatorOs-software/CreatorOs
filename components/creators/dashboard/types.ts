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

export type DealFull = {
  id: string;
  title: string;
  budget: number;
  status: string;
  priority: string;
  platform: string | null;
  deadline: string | null;
  campaign_type: string | null;
  deliverables: string[];
  description: string | null;
  created_at: string;
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
