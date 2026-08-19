import type { SupabaseClient } from "@supabase/supabase-js";
import type { DealCreateInput, DealFull, DealPatch } from "./types";

const DEAL_SELECT = `
  id, title, budget, status, priority, platform, deadline,
  brand_id, creator_id,
  campaign_type, deliverables, description, product, contact_person,
  usage_rights, exclusivity, payment_items, blocker, created_at,
  campaign_start, campaign_end, contract_status, contract_date, contract_url,
  rights, approval_info, delivery_info, guidelines, tracking_assets,
  exclusivity_info, embargo, whitelisting,
  brands(company_name, color, short_code, contact_name, contact_email)
`;

export const DealRepository = {
  async findByCreator(supabase: SupabaseClient, creatorId: string): Promise<DealFull[]> {
    const { data, error } = await supabase
      .from("deals")
      .select(DEAL_SELECT)
      .eq("creator_id", creatorId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as DealFull[];
  },

  async create(
    supabase: SupabaseClient,
    agencyId: string,
    input: DealCreateInput,
  ): Promise<{ id: string }> {
    const { data, error } = await supabase
      .from("deals")
      .insert({ agency_id: agencyId, ...input })
      .select("id")
      .single();
    if (error) throw error;
    return data as { id: string };
  },

  async update(
    supabase: SupabaseClient,
    id: string,
    agencyId: string,
    patch: DealPatch,
  ): Promise<{ id: string; status: string }> {
    const { data, error } = await supabase
      .from("deals")
      .update(patch)
      .eq("id", id)
      .eq("agency_id", agencyId)
      .select("id, status")
      .single();
    if (error) throw error;
    return data as { id: string; status: string };
  },

  async remove(supabase: SupabaseClient, id: string, agencyId: string): Promise<void> {
    const { error } = await supabase
      .from("deals")
      .delete()
      .eq("id", id)
      .eq("agency_id", agencyId);
    if (error) throw error;
  },

  async createFromAnfrage(
    supabase: SupabaseClient,
    agencyId: string,
    anfrageId: string,
    dealData: {
      creator_id: string;
      brand_id: string | null;
      title: string;
      budget: number;
      contact_person: string | null;
      description: string | null;
    },
  ): Promise<{ id: string }> {
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .insert({
        agency_id: agencyId,
        ...dealData,
        platform: null,
        status: "confirmed",
        deliverables: [],
        payment_items: [],
      })
      .select("id")
      .single();
    if (dealError) throw dealError;

    const { error: updateError } = await supabase
      .from("anfragen")
      .update({ status: "gewonnen", linked_deal_id: deal.id })
      .eq("id", anfrageId)
      .eq("agency_id", agencyId);
    if (updateError) throw updateError;

    return deal as { id: string };
  },
};
