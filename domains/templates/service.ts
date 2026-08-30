import { getAuthContext } from "@/domains/auth";
import { createClient } from "@/lib/supabase/server";
import { CreatorRepository } from "@/domains/creators/repository";
import { SocialAccountRepository } from "@/domains/social-accounts/repository";
import { renderResult } from "@/lib/templates/resolve";
import { TemplateRepository } from "./repository";
import type {
  AccountContext,
  BrandContext,
  CreatorContext,
  PlatformStats,
  RenderInput,
  RenderResult,
  Template,
  TemplateContext,
  TemplateInsert,
  TemplatePatch,
} from "./types";

export const TemplateService = {
  async list(): Promise<Template[]> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return TemplateRepository.findAll(supabase, agencyId);
  },

  async create(input: TemplateInsert): Promise<Template> {
    const supabase = await createClient();
    const { agencyId, userId } = await getAuthContext(supabase);
    return TemplateRepository.create(supabase, agencyId, userId, input);
  },

  async update(id: string, patch: TemplatePatch): Promise<Template> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return TemplateRepository.update(supabase, id, agencyId, patch);
  },

  async remove(id: string): Promise<void> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return TemplateRepository.remove(supabase, id, agencyId);
  },

  async render(templateId: string, input: RenderInput): Promise<RenderResult> {
    const supabase = await createClient();
    const auth = await getAuthContext(supabase);

    const template = await TemplateRepository.findById(supabase, templateId);
    if (!template || template.agency_id !== auth.agencyId) {
      throw new Error("Template not found");
    }

    const { creatorId, brandId } = await resolveRefs(supabase, input);

    const [creator, brand, agencyName] = await Promise.all([
      creatorId ? buildCreatorContext(supabase, creatorId) : Promise.resolve(null),
      brandId ? buildBrandContext(supabase, brandId) : Promise.resolve(null),
      TemplateRepository.findAgencyName(supabase, auth.agencyId),
    ]);

    const account: AccountContext = {
      agencyName,
      userName: auth.displayName ?? "",
      userEmail: auth.email ?? "",
    };

    const ctx: TemplateContext = { creator, brand, account };

    return renderResult(template.subject, template.body, ctx);
  },
};

async function resolveRefs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: RenderInput,
): Promise<{ creatorId: string | null; brandId: string | null }> {
  let creatorId = input.creatorId ?? null;
  let brandId = input.brandId ?? null;
  if (creatorId || brandId || !input.threadId) return { creatorId, brandId };

  const thread = await TemplateRepository.findThreadRefs(supabase, input.threadId);
  if (!thread) return { creatorId, brandId };

  const refs = thread.anfrage_id
    ? await TemplateRepository.findAnfrageRefs(supabase, thread.anfrage_id)
    : thread.deal_id
      ? await TemplateRepository.findDealRefs(supabase, thread.deal_id)
      : null;

  creatorId = refs?.creator_id ?? null;
  brandId = refs?.brand_id ?? null;

  if (!creatorId) {
    creatorId = await TemplateRepository.findIntegrationCreatorId(supabase, thread.integration_id);
  }

  return { creatorId, brandId };
}

async function buildCreatorContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  creatorId: string,
): Promise<CreatorContext | null> {
  const creator = await CreatorRepository.findById(supabase, creatorId);
  if (!creator) return null;

  const socialAccounts = new SocialAccountRepository(supabase);
  const [accounts, currentMetrics] = await Promise.all([
    socialAccounts.findByCreator(creatorId),
    socialAccounts.findCurrentMetrics(creatorId),
  ]);

  const metricsByAccount = new Map(currentMetrics.map((m) => [m.creator_account_id, m]));

  const platform: CreatorContext["platform"] = {};
  for (const account of accounts) {
    const metrics = metricsByAccount.get(account.id);
    const stats: PlatformStats = {
      audience: metrics?.audience ?? null,
      engagementRate: metrics?.engagement_rate ?? null,
      views30d: metrics?.views_30d ?? null,
      audienceGrowth7d: metrics?.audience_growth_7d ?? null,
      audienceGrowth30d: metrics?.audience_growth_30d ?? null,
      monthlyRevenue: metrics?.monthly_revenue ?? null,
    };
    platform[account.platform] = stats;
  }

  return {
    name: creator.full_name,
    firstName: creator.full_name.split(" ")[0] || creator.full_name,
    email: creator.email,
    handle: creator.handle,
    followers: creator.followers,
    monthlyRevenue: creator.monthly_revenue,
    platform,
  };
}

async function buildBrandContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  brandId: string,
): Promise<BrandContext | null> {
  const brand = await TemplateRepository.findBrandBasics(supabase, brandId);
  if (!brand) return null;

  const contact = await TemplateRepository.findPrimaryBrandContact(supabase, brandId);

  return {
    name: brand.company_name,
    shortCode: brand.short_code,
    industry: brand.industry,
    contactName: contact?.name ?? null,
    contactEmail: contact?.email ?? null,
  };
}
