import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CreatorContact,
  WhatsAppConnectionRow,
  WhatsAppMessageRecord,
} from "./types";

const CONNECTION_COLS =
  "id, agency_id, status, from_number, twilio_account_sid, twilio_auth_token, messaging_service_sid, content_sid, template_name, last_error, connected_at";

export const WhatsAppRepository = {
  async findConnection(
    supabase: SupabaseClient,
    agencyId: string,
  ): Promise<WhatsAppConnectionRow | null> {
    const { data, error } = await supabase
      .from("whatsapp_connections")
      .select(CONNECTION_COLS)
      .eq("agency_id", agencyId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as WhatsAppConnectionRow | null) ?? null;
  },

  async upsertConnection(
    supabase: SupabaseClient,
    agencyId: string,
    patch: Partial<Omit<WhatsAppConnectionRow, "id" | "agency_id">> & {
      created_by?: string | null;
    },
  ): Promise<WhatsAppConnectionRow> {
    const { data, error } = await supabase
      .from("whatsapp_connections")
      .upsert({ agency_id: agencyId, ...patch }, { onConflict: "agency_id" })
      .select(CONNECTION_COLS)
      .single();
    if (error) throw new Error(error.message);
    return data as WhatsAppConnectionRow;
  },

  async disconnectConnection(
    supabase: SupabaseClient,
    agencyId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from("whatsapp_connections")
      .update({ status: "disconnected", twilio_auth_token: null, connected_at: null })
      .eq("agency_id", agencyId);
    if (error) throw new Error(error.message);
  },

  async findCreatorContact(
    supabase: SupabaseClient,
    agencyId: string,
    creatorId: string,
  ): Promise<CreatorContact | null> {
    const { data, error } = await supabase
      .from("creators")
      .select("full_name, phone, whatsapp_opt_in")
      .eq("id", creatorId)
      .eq("agency_id", agencyId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as CreatorContact | null) ?? null;
  },

  /** Best-effort audit insert — callers wrap in try/catch, no rethrow. */
  async insertMessage(
    supabase: SupabaseClient,
    row: WhatsAppMessageRecord,
  ): Promise<void> {
    const { error } = await supabase.from("whatsapp_messages").insert(row);
    if (error) throw new Error(error.message);
  },
};
