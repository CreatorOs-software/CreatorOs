export type Deliverable = {
  count: number;
  content_type: string;
  platform: string;
  draft_deadline?: string | null;
  freigabe_deadline?: string | null;
  live_date?: string | null;
  status?: "offen" | "in_arbeit" | "in_freigabe" | "live" | "abgelehnt" | null;
};

export type DealRights = {
  scope?: "nur_gepostet" | "inkl_rohmaterial" | null;
  territory?: "DACH" | "EU" | "weltweit" | "individuell" | null;
  territory_custom?: string | null;
  duration_value?: number | null;
  duration_unit?: "wochen" | "monate" | "jahre" | "unbegrenzt" | null;
  duration_start_type?: "live_gang" | "kampagnenstart" | null;
  live_gang_date?: string | null;
  channels?: string[];
  modifications?: string[];
  transferability?: string[];
  extension?: {
    duration_value?: number | null;
    duration_unit?: string | null;
    price?: number | null;
    deadline?: string | null;
  } | null;
};

export type ApprovalInfo = {
  correction_rounds?: number;
  corrections_used?: number;
  approver_name?: string | null;
  approver_role?: string | null;
  approval_days?: number | null;
};

export type DeliveryInfo = {
  address?: string | null;
  tracking_number?: string | null;
  status?: "ausstehend" | "versendet" | "erhalten" | null;
};

export type DealGuidelines = {
  labeling?: string | null;
  wording?: string | null;
  nogo?: string | null;
  hashtags?: string[];
  links?: string[];
};

export type TrackingAssets = {
  discount_code?: string | null;
  affiliate_link?: string | null;
  utm_params?: string | null;
};

export type ExclusivityInfo = {
  category?: string | null;
  end_date?: string | null;
  competitors?: string[];
};

export type Embargo = {
  date?: string | null;
  notes?: string | null;
};

export type WhitelistingInfo = {
  spark_expiry?: string | null;
  meta_expiry?: string | null;
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
  campaign_start: string | null;
  campaign_end: string | null;
  contract_status: "offen" | "versendet" | "unterschrieben" | null;
  contract_date: string | null;
  contract_url: string | null;
  rights: DealRights | null;
  approval_info: ApprovalInfo | null;
  delivery_info: DeliveryInfo | null;
  guidelines: DealGuidelines | null;
  tracking_assets: TrackingAssets | null;
  exclusivity_info: ExclusivityInfo | null;
  embargo: Embargo | null;
  whitelisting: WhitelistingInfo | null;
  brands: {
    company_name: string;
    short_code: string;
    contact_name: string | null;
    contact_email: string | null;
  } | null;
};

export type DealPatch = {
  status?: string;
  title?: string;
  brand_id?: string | null;
  product?: string | null;
  platform?: string | null;
  creator_id?: string | null;
  contact_person?: string | null;
  deliverables?: Deliverable[];
  deadline?: string | null;
  usage_rights?: string | null;
  exclusivity?: string | null;
  description?: string | null;
  budget?: number;
  payment_items?: PaymentItem[];
  campaign_start?: string | null;
  campaign_end?: string | null;
  assignee_id?: string | null;
  contract_status?: "offen" | "versendet" | "unterschrieben" | null;
  contract_date?: string | null;
  contract_url?: string | null;
  rights?: DealRights | null;
  approval_info?: ApprovalInfo | null;
  delivery_info?: DeliveryInfo | null;
  guidelines?: DealGuidelines | null;
  tracking_assets?: TrackingAssets | null;
  exclusivity_info?: ExclusivityInfo | null;
  embargo?: Embargo | null;
  whitelisting?: WhitelistingInfo | null;
};

export type DealCreateInput = {
  creator_id: string;
  brand_id?: string | null;
  title: string;
  product?: string | null;
  contact_person?: string | null;
  campaign_start?: string | null;
  campaign_end?: string | null;
  assignee_id?: string | null;
  deliverables: Deliverable[];
  description?: string | null;
  guidelines?: DealGuidelines | null;
  tracking_assets?: TrackingAssets | null;
  rights?: DealRights | null;
  exclusivity_info?: ExclusivityInfo | null;
  embargo?: Embargo | null;
  whitelisting?: WhitelistingInfo | null;
  contract_status?: "offen" | "versendet" | "unterschrieben" | null;
  contract_date?: string | null;
  contract_url?: string | null;
  budget: number;
  payment_items: PaymentItem[];
  status?: string;
  source?: string;
};
