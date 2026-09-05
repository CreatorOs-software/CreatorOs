import type { SupabaseClient } from "@supabase/supabase-js";
import type { Anfrage, AnfrageCreateInput, AnfragePatch } from "./types";

const ANFRAGE_SELECT = `
  id, creator_id, brand_id, brand_name, contact_person,
  title, product, campaign_start, campaign_end,
  deliverables, payment_items, fee, guidelines, tracking_assets,
  format, budget_requested, budget_offer, source, status,
  rejection_reason, notes, linked_deal_id, created_at, updated_at,
  brands(company_name, short_code, contact_name, contact_email)
`;

export const AnfrageRepository = {
  async findByCreator(supabase: SupabaseClient, creatorId: string): Promise<Anfrage[]> {
    const { data, error } = await supabase
      .from("anfragen")
      .select(ANFRAGE_SELECT)
      .eq("creator_id", creatorId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as Anfrage[];
  },

  async findById(
    supabase: SupabaseClient,
    id: string,
    agencyId: string,
  ): Promise<Anfrage | null> {
    const { data, error } = await supabase
      .from("anfragen")
      .select(ANFRAGE_SELECT)
      .eq("id", id)
      .eq("agency_id", agencyId)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as unknown as Anfrage | null;
  },

  async create(
    supabase: SupabaseClient,
    agencyId: string,
    input: AnfrageCreateInput,
  ): Promise<Anfrage> {
    const { data, error } = await supabase
      .from("anfragen")
      .insert({ agency_id: agencyId, ...input })
      .select(ANFRAGE_SELECT)
      .single();
    if (error) throw error;
    return data as unknown as Anfrage;
  },

  async update(
    supabase: SupabaseClient,
    id: string,
    agencyId: string,
    patch: AnfragePatch,
  ): Promise<{ id: string; status: string }> {
    const { data, error } = await supabase
      .from("anfragen")
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
      .from("anfragen")
      .delete()
      .eq("id", id)
      .eq("agency_id", agencyId);
    if (error) throw error;
  },
};
