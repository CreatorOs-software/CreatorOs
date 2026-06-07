import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmailIntegration, IntegrationPatch } from "./types";

export const IntegrationRepository = {
  async findAll(
    supabase: SupabaseClient,
    agencyId: string,
  ): Promise<Pick<EmailIntegration, "id" | "email" | "display_name" | "provider" | "status" | "last_sync_at" | "connected_at">[]> {
    const { data, error } = await supabase
      .from("email_integrations")
      .select(
        "id, email, display_name, provider, status, last_sync_at, connected_at",
      )
      .eq("agency_id", agencyId)
      .order("connected_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async findById(
    supabase: SupabaseClient,
    id: string,
  ): Promise<{ id: string } | null> {
    const { data } = await supabase
      .from("email_integrations")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    return data ?? null;
  },

  async findExisting(
    supabase: SupabaseClient,
    agencyId: string,
    email: string,
    provider: string,
  ): Promise<{ id: string } | null> {
    const { data } = await supabase
      .from("email_integrations")
      .select("id")
      .eq("agency_id", agencyId)
      .eq("email", email)
      .eq("provider", provider)
      .maybeSingle();
    return data ?? null;
  },

  async create(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<string> {
    const { data, error } = await supabase
      .from("email_integrations")
      .insert(payload)
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return (data as { id: string }).id;
  },

  async update(
    supabase: SupabaseClient,
    id: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await supabase
      .from("email_integrations")
      .update(payload)
      .eq("id", id);

    if (error) throw new Error(error.message);
  },

  async patch(
    supabase: SupabaseClient,
    id: string,
    patch: IntegrationPatch,
  ): Promise<void> {
    const { error } = await supabase
      .from("email_integrations")
      .update(patch)
      .eq("id", id);

    if (error) throw new Error(error.message);
  },

  async softDelete(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase
      .from("email_integrations")
      .update({ status: "disconnected", deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw new Error(error.message);
  },
};
