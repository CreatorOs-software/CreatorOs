import { getAuthContext } from "@/domains/auth";
import { createClient } from "@/lib/supabase/server";
import { DealRepository } from "./repository";
import type { DealCreateInput, DealFull, DealPatch } from "./types";

export class DealError extends Error {}

export const DealService = {
  async getDealsByCreator(creatorId: string): Promise<DealFull[]> {
    const supabase = await createClient();
    await getAuthContext(supabase);
    return DealRepository.findByCreator(supabase, creatorId);
  },

  async createDeal(
    creatorId: string,
    input: Omit<DealCreateInput, "creator_id">,
  ): Promise<{ id: string }> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return DealRepository.create(supabase, agencyId, { ...input, creator_id: creatorId });
  },

  async updateDeal(id: string, patch: DealPatch): Promise<{ id: string; status: string }> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return DealRepository.update(supabase, id, agencyId, patch);
  },

  async deleteDeal(id: string): Promise<void> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return DealRepository.remove(supabase, id, agencyId);
  },

  async createFromAnfrage(anfrageId: string): Promise<{ deal_id: string }> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);

    const { data: anfrage, error: fetchError } = await supabase
      .from("anfragen")
      .select("*")
      .eq("id", anfrageId)
      .eq("agency_id", agencyId)
      .single();

    if (fetchError || !anfrage) throw new DealError("Anfrage nicht gefunden");

    if (anfrage.linked_deal_id) return { deal_id: anfrage.linked_deal_id as string };

    const brandName =
      (anfrage.brands as { company_name?: string } | null)?.company_name ??
      (anfrage.brand_name as string | null) ??
      "Unbekannte Brand";
    const title = anfrage.format ? `${brandName} – ${anfrage.format}` : brandName;

    const deal = await DealRepository.createFromAnfrage(supabase, agencyId, anfrageId, {
      creator_id: anfrage.creator_id as string,
      brand_id: (anfrage.brand_id as string | null) ?? null,
      title,
      budget: (anfrage.budget_offer as number | null) ?? (anfrage.budget_requested as number | null) ?? 0,
      contact_person: (anfrage.contact_person as string | null) ?? null,
      description: (anfrage.notes as string | null) ?? null,
    });

    return { deal_id: deal.id };
  },
};
