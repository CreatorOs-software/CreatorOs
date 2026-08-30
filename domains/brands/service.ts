import { getAuthContext } from "@/domains/auth";
import { createClient } from "@/lib/supabase/server";
import { BrandRepository } from "./repository";
import type {
  Brand,
  BrandContact,
  BrandDetail,
  BrandListItem,
  BrandPatch,
  ContactPatch,
  CreatorRef,
  CreatorSummary,
} from "./types";

const LAUFEND = new Set(["confirmed", "production", "approval", "scheduled", "posted"]);
const ALT = new Set(["invoiced", "paid"]);

export class BrandError extends Error {}

export const BrandService = {
  async listBrands(): Promise<BrandListItem[]> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    const { brands, deals, anfragen } = await BrandRepository.findAll(supabase, agencyId);

    const now = Date.now();

    return brands.map((brand) => {
      const brandDeals = deals.filter((d) => d.brand_id === brand.id);
      const brandAnfragen = anfragen.filter((a) => a.brand_id === brand.id);

      const activeDealCount = brandDeals.filter((d) => LAUFEND.has(d.status)).length;
      const totalRevenue = brandDeals
        .filter((d) => LAUFEND.has(d.status) || ALT.has(d.status))
        .reduce((s, d) => s + Number(d.budget), 0);

      const lastActivity =
        brandDeals.length > 0
          ? brandDeals.reduce(
              (max, d) => (d.created_at > max ? d.created_at : max),
              brandDeals[0].created_at,
            )
          : null;

      const hasOverduePayment = brandDeals.some((d) => {
        if (!d.payment_items) return false;
        return (d.payment_items as Array<{ invoice_date?: string; paid_at?: string; payment_term?: number }>).some(
          (item) => {
            if (!item.invoice_date || item.paid_at) return false;
            const due =
              new Date(item.invoice_date).getTime() + (item.payment_term ?? 30) * 86_400_000;
            return due < now;
          },
        );
      });

      return {
        ...brand,
        deal_count: brandDeals.length,
        active_deal_count: activeDealCount,
        total_revenue: totalRevenue,
        last_activity: lastActivity,
        has_overdue_payment: hasOverduePayment,
        only_contact: brandDeals.length === 0 && brandAnfragen.length > 0,
      } as BrandListItem;
    });
  },

  async getBrand(id: string): Promise<BrandDetail> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    const { brand, contacts, deals, anfragen, allCreators } = await BrandRepository.findById(
      supabase,
      id,
      agencyId,
    );

    const creatorMap = new Map<string, { creator: CreatorSummary["creator"]; deals: typeof deals; anfragen: typeof anfragen }>();

    for (const deal of deals) {
      const creator = deal.creators as unknown as CreatorRef | null;
      if (!creator?.id) continue;
      if (!creatorMap.has(creator.id))
        creatorMap.set(creator.id, { creator, deals: [], anfragen: [] });
      creatorMap.get(creator.id)!.deals.push(deal);
    }

    for (const anfrage of anfragen) {
      const creator = anfrage.creators as unknown as CreatorRef | null;
      if (!creator?.id) continue;
      if (!creatorMap.has(creator.id))
        creatorMap.set(creator.id, { creator, deals: [], anfragen: [] });
      creatorMap.get(creator.id)!.anfragen.push(anfrage);
    }

    const creatorSummaries: CreatorSummary[] = Array.from(creatorMap.values()).map(
      ({ creator, deals: cDeals, anfragen: cAnfragen }) => ({
        creator,
        deals: cDeals,
        anfragen: cAnfragen,
        has_active_deal: cDeals.some((d) => LAUFEND.has(d.status)),
        total_revenue: cDeals
          .filter((d) => LAUFEND.has(d.status) || ALT.has(d.status))
          .reduce((s, d) => s + Number(d.budget), 0),
        only_contact: cDeals.length === 0,
      }),
    );

    const involvedCreatorIds = new Set(creatorMap.keys());
    const gapCreators = allCreators.filter((c) => !involvedCreatorIds.has(c.id));

    return {
      brand,
      contacts,
      creator_summaries: creatorSummaries,
      all_deals: deals,
      gap_creators: gapCreators,
    };
  },

  async createBrand(data: {
    company_name: string;
    short_code: string;
    industry?: string | null;
  }): Promise<Brand> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return BrandRepository.create(supabase, agencyId, data);
  },

  async updateBrand(id: string, patch: BrandPatch): Promise<Brand> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return BrandRepository.update(supabase, id, agencyId, patch);
  },

  async deleteBrand(id: string): Promise<void> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return BrandRepository.remove(supabase, id, agencyId);
  },

  async getContacts(brandId: string): Promise<BrandContact[]> {
    const supabase = await createClient();
    await getAuthContext(supabase);
    return BrandRepository.findContacts(supabase, brandId);
  },

  async createContact(
    brandId: string,
    data: { name: string; role?: string | null; email?: string | null; phone?: string | null },
  ): Promise<BrandContact> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    await BrandRepository.assertBrandOwnership(supabase, brandId, agencyId);
    return BrandRepository.createContact(supabase, brandId, agencyId, data);
  },

  async updateContact(id: string, patch: ContactPatch): Promise<BrandContact> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return BrandRepository.updateContact(supabase, id, agencyId, patch);
  },

  async deleteContact(id: string): Promise<void> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return BrandRepository.removeContact(supabase, id, agencyId);
  },
};
