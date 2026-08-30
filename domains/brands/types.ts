export type Brand = {
  id: string;
  agency_id: string;
  company_name: string;
  short_code: string;
  industry: string | null;
  notes: string | null;
};

export type BrandListItem = Brand & {
  deal_count: number;
  active_deal_count: number;
  total_revenue: number;
  last_activity: string | null;
  has_overdue_payment: boolean;
  only_contact: boolean;
};

export type BrandContact = {
  id: string;
  brand_id: string;
  agency_id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
};

export type BrandPatch = {
  company_name?: string;
  short_code?: string;
  industry?: string | null;
  notes?: string | null;
};

export type ContactPatch = {
  name?: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type CreatorRef = {
  id: string;
  full_name: string;
  initials: string;
};

export type DealRef = {
  id: string;
  title: string;
  budget: number;
  status: string;
  deadline: string | null;
  campaign_type: string | null;
  usage_rights: string | null;
  exclusivity: string | null;
  payment_items: unknown;
  created_at: string;
  creator_id: string;
  creators: CreatorRef;
};

export type AnfrageRef = {
  id: string;
  format: string | null;
  budget_requested: number | null;
  status: string;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  creator_id: string;
  creators: CreatorRef;
};

export type CreatorSummary = {
  creator: CreatorRef;
  deals: DealRef[];
  anfragen: AnfrageRef[];
  has_active_deal: boolean;
  total_revenue: number;
  only_contact: boolean;
};

export type BrandDetail = {
  brand: Brand;
  contacts: BrandContact[];
  creator_summaries: CreatorSummary[];
  all_deals: DealRef[];
  gap_creators: CreatorRef[];
};
