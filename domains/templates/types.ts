import type { Platform } from "@/lib/platforms/types";

export type TemplateChannel = "email" | "whatsapp" | "general";

export type Template = {
  id: string;
  agency_id: string;
  name: string;
  channel: TemplateChannel;
  subject: string | null;
  body: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TemplateInsert = {
  name: string;
  channel: TemplateChannel;
  subject?: string | null;
  body: string;
};

export type TemplatePatch = Partial<TemplateInsert>;

export type RenderInput = {
  threadId?: string;
  /** The mailbox to resolve "creator" against when there's no thread yet (e.g. composing a new email). */
  integrationId?: string;
  creatorId?: string;
  brandId?: string;
};

export type RenderResult = {
  subject: string | null;
  body: string;
  unresolved: string[];
};

// ── Template context (the data variables resolve against) ──────────────────────

export type PlatformStats = {
  audience: number | null;
  engagementRate: number | null;
  views30d: number | null;
  audienceGrowth7d: number | null;
  audienceGrowth30d: number | null;
  monthlyRevenue: number | null;
};

export type CreatorContext = {
  name: string;
  firstName: string;
  email: string | null;
  handle: string | null;
  followers: string | null;
  monthlyRevenue: number;
  platform: Partial<Record<Platform, PlatformStats>>;
};

export type BrandContext = {
  name: string;
  shortCode: string;
  industry: string | null;
  contactName: string | null;
  contactEmail: string | null;
};

export type AccountContext = {
  agencyName: string;
  userName: string;
  userEmail: string;
};

export type TemplateContext = {
  creator: CreatorContext | null;
  brand: BrandContext | null;
  account: AccountContext;
};
