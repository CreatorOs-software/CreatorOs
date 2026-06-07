import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Creator,
  CreatorInsert,
  CreatorPatch,
  CreatorsPageData,
} from "./types";

export const CreatorRepository = {
  async findPageData(
    supabase: SupabaseClient,
    agencyId: string,
  ): Promise<CreatorsPageData> {
    const [creatorsRes, brandsRes, dealsRes, mailboxesRes] = await Promise.all([
      supabase
        .from("creators")
        .select("*")
        .eq("agency_id", agencyId)
        .order("full_name"),
      supabase.from("brands").select("*").eq("agency_id", agencyId),
      supabase.from("deals").select("*").eq("agency_id", agencyId),
      supabase
        .from("email_integrations")
        .select("id, email, display_name, provider, creator_id")
        .eq("agency_id", agencyId)
        .eq("status", "connected"),
    ]);

    return {
      creators: creatorsRes.data ?? [],
      brands: brandsRes.data ?? [],
      deals: dealsRes.data ?? [],
      mailboxes: mailboxesRes.data ?? [],
    };
  },

  async create(supabase: SupabaseClient, data: CreatorInsert): Promise<Creator> {
    const { data: row, error } = await supabase
      .from("creators")
      .insert(data)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return row as Creator;
  },

  async patch(
    supabase: SupabaseClient,
    id: string,
    patch: CreatorPatch,
  ): Promise<void> {
    const { error } = await supabase
      .from("creators")
      .update(patch)
      .eq("id", id);

    if (error) throw new Error(error.message);
  },
};
