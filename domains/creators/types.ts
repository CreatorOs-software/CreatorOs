export type CreatorRate = {
  label: string;
  amount: number;
  bundle?: boolean;
};

export type Creator = {
  id: string;
  agency_id: string;
  full_name: string;
  handle: string | null;
  niche: string[];
  bio: string | null;
  email: string | null;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  followers: string | null;
  monthly_revenue: number;
  status: "active" | "on-break" | "inactive";
  platforms: string[];
  color: string;
  initials: string;
  rates: CreatorRate[];
  dream_brands: string[];
  wish_themes: string[];
  no_go: string[];
};

export type CreatorInsert = Omit<Creator, "id">;

export type CreatorPatch = Partial<
  Omit<Creator, "id" | "agency_id">
>;

export type Brand = {
  id: string;
  agency_id: string;
  company_name: string;
  short_code: string;
  color: string;
  industry: string | null;
  contact_name: string | null;
  contact_email: string | null;
};

export type Deal = {
  id: string;
  agency_id: string;
  creator_id: string | null;
  brand_id: string | null;
  title: string;
  budget: number;
  status: string;
  deadline: string | null;
  campaign_type: string | null;
  deliverables: string[];
};

export type CreatorMailbox = {
  id: string;
  email: string;
  display_name: string | null;
  provider: string;
  creator_id: string | null;
};

export type CreatorsPageData = {
  creators: Creator[];
  brands: Brand[];
  deals: Deal[];
  mailboxes: CreatorMailbox[];
};
