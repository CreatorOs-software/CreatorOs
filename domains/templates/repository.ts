import type { SupabaseClient } from "@supabase/supabase-js";
import type { Template, TemplateInsert, TemplatePatch } from "./types";

export type ThreadRefs = {
  integration_id: string;
  brand_id: string | null;
};

export const TemplateRepository = {
  async findAll(supabase: SupabaseClient, agencyId: string): Promise<Template[]> {
    const { data, error } = await supabase
      .from("templates")
      .select("*")
      .eq("agency_id", agencyId)
      .order("name");
    if (error) throw error;
    return (data ?? []) as Template[];
  },

  async findById(supabase: SupabaseClient, id: string): Promise<Template | null> {
    const { data, error } = await supabase
      .from("templates")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data as Template | null;
  },

  async create(
    supabase: SupabaseClient,
    agencyId: string,
    createdBy: string,
    input: TemplateInsert,
  ): Promise<Template> {
    const { data, error } = await supabase
      .from("templates")
      .insert({ agency_id: agencyId, created_by: createdBy, ...input })
      .select("*")
      .single();
    if (error) throw error;
    return data as Template;
  },

  async update(
    supabase: SupabaseClient,
    id: string,
    agencyId: string,
    patch: TemplatePatch,
  ): Promise<Template> {
    const { data, error } = await supabase
      .from("templates")
      .update(patch)
      .eq("id", id)
      .eq("agency_id", agencyId)
      .select("*")
      .single();
    if (error) throw error;
    return data as Template;
  },

  async remove(supabase: SupabaseClient, id: string, agencyId: string): Promise<void> {
    const { error } = await supabase
      .from("templates")
      .delete()
      .eq("id", id)
      .eq("agency_id", agencyId);
    if (error) throw error;
  },

  // ── Context resolution helpers ────────────────────────────────────────────────

  async findThreadRefs(supabase: SupabaseClient, threadId: string): Promise<ThreadRefs | null> {
    const { data, error } = await supabase
      .from("email_threads")
      .select("integration_id, brand_id")
      .eq("id", threadId)
      .maybeSingle();
    if (error) throw error;
    return data as ThreadRefs | null;
  },

  async findIntegrationCreatorId(supabase: SupabaseClient, integrationId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from("email_integrations")
      .select("creator_id")
      .eq("id", integrationId)
      .maybeSingle();
    if (error) throw error;
    return (data?.creator_id as string | null) ?? null;
  },

  async findBrandBasics(
    supabase: SupabaseClient,
    brandId: string,
  ): Promise<{ company_name: string; short_code: string; industry: string | null } | null> {
    const { data, error } = await supabase
      .from("brands")
      .select("company_name, short_code, industry")
      .eq("id", brandId)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  },

  async findAgencyName(supabase: SupabaseClient, agencyId: string): Promise<string> {
    const { data, error } = await supabase
      .from("agencies")
      .select("name")
      .eq("id", agencyId)
      .maybeSingle();
    if (error) throw error;
    return (data?.name as string | undefined) ?? "";
  },

  async findPrimaryBrandContact(
    supabase: SupabaseClient,
    brandId: string,
  ): Promise<{ name: string; email: string | null } | null> {
    const { data, error } = await supabase
      .from("brand_contacts")
      .select("name, email")
      .eq("brand_id", brandId)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  },
};
