import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreatorContact, WhatsAppConnectionRow, WhatsAppContactRow, WhatsAppMessageRecord, WhatsAppTemplate } from "./types";

const CONNECTION_COLS = "id, agency_id, provider, status, from_number, twilio_account_sid, twilio_auth_token, messaging_service_sid, content_sid, template_name, waba_id, phone_number_id, business_id, display_phone_number, verified_name, access_token_encrypted, token_expires_at, webhook_subscribed_at, last_error, connected_at";

export const WhatsAppRepository = {
  async findConnection(supabase: SupabaseClient, agencyId: string): Promise<WhatsAppConnectionRow | null> {
    const { data, error } = await supabase.from("whatsapp_connections").select(CONNECTION_COLS).eq("agency_id", agencyId).maybeSingle();
    if (error) throw new Error(error.message);
    return (data as WhatsAppConnectionRow | null) ?? null;
  },

  async findConnectionByPhoneNumberId(supabase: SupabaseClient, phoneNumberId: string): Promise<WhatsAppConnectionRow | null> {
    const { data, error } = await supabase.from("whatsapp_connections").select(CONNECTION_COLS).eq("provider", "meta").eq("phone_number_id", phoneNumberId).eq("status", "connected").maybeSingle();
    if (error) throw new Error(error.message);
    return (data as WhatsAppConnectionRow | null) ?? null;
  },

  async upsertConnection(supabase: SupabaseClient, agencyId: string, patch: Partial<Omit<WhatsAppConnectionRow, "id" | "agency_id">> & { created_by?: string | null }): Promise<WhatsAppConnectionRow> {
    const { data, error } = await supabase.from("whatsapp_connections").upsert({ agency_id: agencyId, ...patch }, { onConflict: "agency_id" }).select(CONNECTION_COLS).single();
    if (error) throw new Error(error.message);
    return data as WhatsAppConnectionRow;
  },

  async disconnectConnection(supabase: SupabaseClient, agencyId: string): Promise<void> {
    const { error } = await supabase.from("whatsapp_connections").update({
      status: "disconnected", access_token_encrypted: null, token_expires_at: null,
      webhook_subscribed_at: null, connected_at: null,
    }).eq("agency_id", agencyId);
    if (error) throw new Error(error.message);
  },

  async findCreatorContact(supabase: SupabaseClient, agencyId: string, creatorId: string): Promise<CreatorContact | null> {
    const { data, error } = await supabase.from("creators").select("full_name, phone, whatsapp_opt_in").eq("id", creatorId).eq("agency_id", agencyId).maybeSingle();
    if (error) throw new Error(error.message);
    return (data as CreatorContact | null) ?? null;
  },

  async threadBelongsToAgency(supabase: SupabaseClient, agencyId: string, threadId: string): Promise<boolean> {
    const { data, error } = await supabase.from("email_threads").select("id").eq("id", threadId).eq("agency_id", agencyId).maybeSingle();
    if (error) throw new Error(error.message);
    return data !== null;
  },

  async findContact(supabase: SupabaseClient, agencyId: string, waId: string): Promise<WhatsAppContactRow | null> {
    const { data, error } = await supabase.from("whatsapp_contacts").select("agency_id, wa_id, creator_id, display_name, last_inbound_at, last_inbound_message_id").eq("agency_id", agencyId).eq("wa_id", waId).maybeSingle();
    if (error) throw new Error(error.message);
    return (data as WhatsAppContactRow | null) ?? null;
  },

  async upsertInboundContact(supabase: SupabaseClient, row: WhatsAppContactRow): Promise<void> {
    const { error } = await supabase.from("whatsapp_contacts").upsert(row, { onConflict: "agency_id,wa_id" });
    if (error) throw new Error(error.message);
  },

  async listTemplates(supabase: SupabaseClient, agencyId: string): Promise<WhatsAppTemplate[]> {
    const { data, error } = await supabase.from("whatsapp_templates").select("id, meta_template_id, name, language, category, status, components").eq("agency_id", agencyId).eq("status", "APPROVED").order("name");
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      id: row.id as string, metaTemplateId: row.meta_template_id as string,
      name: row.name as string, language: row.language as string,
      category: row.category as string, status: row.status as string,
      bodyParamCount: bodyParamCount(row.components),
    }));
  },

  async findTemplate(supabase: SupabaseClient, agencyId: string, name: string): Promise<WhatsAppTemplate | null> {
    const templates = await this.listTemplates(supabase, agencyId);
    return templates.find((template) => template.name === name) ?? null;
  },

  async replaceTemplates(supabase: SupabaseClient, agencyId: string, templates: { meta_template_id: string; name: string; language: string; category: string; status: string; components: unknown[] }[]): Promise<void> {
    const { error: deleteError } = await supabase.from("whatsapp_templates").delete().eq("agency_id", agencyId);
    if (deleteError) throw new Error(deleteError.message);
    if (!templates.length) return;
    const { error } = await supabase.from("whatsapp_templates").insert(templates.map((template) => ({ ...template, agency_id: agencyId })));
    if (error) throw new Error(error.message);
  },

  async insertMessage(supabase: SupabaseClient, row: WhatsAppMessageRecord): Promise<void> {
    const { error } = await supabase.from("whatsapp_messages").insert(row);
    if (error && error.code !== "23505") throw new Error(error.message);
  },

  async updateMessageStatus(supabase: SupabaseClient, waMessageId: string, status: "sent" | "delivered" | "read" | "failed", errorMessage: string | null, timestamp: string): Promise<void> {
    // Meta explicitly documents that status webhooks can arrive late or
    // duplicated. Read the current row first so a delayed/duplicate event
    // can never move the headline status backwards (e.g. a late "delivered"
    // landing after "read" was already recorded) — only timestamps that are
    // still unset get backfilled, and "failed" is treated as terminal.
    const { data: existing, error: fetchError } = await supabase
      .from("whatsapp_messages")
      .select("status, delivered_at, read_at, failed_at")
      .eq("wa_message_id", waMessageId)
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    if (!existing || existing.status === "failed") return;

    const rank: Record<string, number> = { accepted: 0, sent: 1, delivered: 2, read: 3, failed: 4 };
    const currentRank = rank[existing.status as string] ?? -1;
    const newRank = rank[status] ?? -1;

    const patch: Record<string, string | null> = {};
    if (status === "delivered" && !existing.delivered_at) patch.delivered_at = timestamp;
    if (status === "read" && !existing.read_at) patch.read_at = timestamp;
    if (status === "failed" && !existing.failed_at) patch.failed_at = timestamp;
    if (newRank > currentRank) {
      patch.status = status;
      patch.error = errorMessage;
    }
    if (Object.keys(patch).length === 0) return;

    const { error } = await supabase.from("whatsapp_messages").update(patch).eq("wa_message_id", waMessageId);
    if (error) throw new Error(error.message);
  },
};

function bodyParamCount(components: unknown): number {
  if (!Array.isArray(components)) return 0;
  const body = components.find((component) => typeof component === "object" && component !== null && "type" in component && String((component as { type?: string }).type).toUpperCase() === "BODY") as { text?: string } | undefined;
  return new Set(body?.text?.match(/{{\d+}}/g) ?? []).size;
}
