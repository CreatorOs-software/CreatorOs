export type Creator = {
  id: string;
  agency_id: string;
  full_name: string;
  handle: string | null;
  niche: string | null;
  followers: string | null;
  monthly_revenue: number;
  status: "active" | "on-break" | "inactive";
  platforms: string[];
  color: string;
  initials: string;
};

export type CreatorInsert = Omit<Creator, "id">;

export type CreatorPatch = Partial<
  Omit<Creator, "id" | "agency_id">
>;

export type Brand = {
  id: string;
  agency_id: string;
  name: string;
  [key: string]: unknown;
};

export type Deal = {
  id: string;
  agency_id: string;
  creator_id: string;
  status: string;
  [key: string]: unknown;
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
