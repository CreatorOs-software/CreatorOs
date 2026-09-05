import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  EmitInput,
  MuteInput,
  Notification,
  NotificationMute,
  NotificationStatus,
} from "./types";

const NOTIFICATION_SELECT = `
  id, type, severity, subject_type, subject_id, vorgang_key, creator_id,
  title, reason, href, payload, status, todo_id, created_at, updated_at, read_at,
  creator:creator_id (id, full_name, initials)
`;

const MUTE_SELECT = `id, scope_type, scope_key, created_at`;

export const NotificationRepository = {
  async emit(supabase: SupabaseClient, input: EmitInput): Promise<string | null> {
    const { data, error } = await supabase.rpc("emit_notification", {
      p_agency_id: input.agencyId,
      p_recipient_id: input.recipientId,
      p_type: input.type,
      p_severity: input.severity,
      p_subject_type: input.subjectType,
      p_subject_id: input.subjectId,
      p_vorgang_key: input.vorgangKey,
      p_creator_id: input.creatorId ?? null,
      p_title: input.title,
      p_reason: input.reason ?? null,
      p_href: input.href ?? null,
      p_payload: input.payload ?? {},
      p_bundle_key: input.bundleKey ?? null,
    });
    if (error) throw error;
    return (data as string | null) ?? null;
  },

  async findForUser(
    supabase: SupabaseClient,
    agencyId: string,
    userId: string,
  ): Promise<Notification[]> {
    const { data, error } = await supabase
      .from("notifications")
      .select(NOTIFICATION_SELECT)
      .eq("agency_id", agencyId)
      .eq("recipient_id", userId)
      .eq("status", "OPEN")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as Notification[];
  },

  async getById(
    supabase: SupabaseClient,
    id: string,
    agencyId: string,
    userId: string,
  ): Promise<Notification | null> {
    const { data, error } = await supabase
      .from("notifications")
      .select(NOTIFICATION_SELECT)
      .eq("id", id)
      .eq("agency_id", agencyId)
      .eq("recipient_id", userId)
      .maybeSingle();
    if (error) throw error;
    return (data as unknown as Notification) ?? null;
  },

  async setStatus(
    supabase: SupabaseClient,
    id: string,
    agencyId: string,
    userId: string,
    status: Exclude<NotificationStatus, "CONVERTED">,
  ): Promise<Notification> {
    const patch: Record<string, unknown> = { status };
    if (status === "DISMISSED") patch.dismissed_at = new Date().toISOString();
    const { data, error } = await supabase
      .from("notifications")
      .update(patch)
      .eq("id", id)
      .eq("agency_id", agencyId)
      .eq("recipient_id", userId)
      .select(NOTIFICATION_SELECT)
      .single();
    if (error) throw error;
    return data as unknown as Notification;
  },

  async attachTodo(
    supabase: SupabaseClient,
    id: string,
    agencyId: string,
    userId: string,
    todoId: string,
  ): Promise<Notification> {
    const { data, error } = await supabase
      .from("notifications")
      .update({ status: "CONVERTED", todo_id: todoId })
      .eq("id", id)
      .eq("agency_id", agencyId)
      .eq("recipient_id", userId)
      .select(NOTIFICATION_SELECT)
      .single();
    if (error) throw error;
    return data as unknown as Notification;
  },

  async markAllRead(
    supabase: SupabaseClient,
    agencyId: string,
    userId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("agency_id", agencyId)
      .eq("recipient_id", userId)
      .eq("status", "OPEN")
      .is("read_at", null);
    if (error) throw error;
  },

  async listMutes(
    supabase: SupabaseClient,
    agencyId: string,
    userId: string,
  ): Promise<NotificationMute[]> {
    const { data, error } = await supabase
      .from("notification_mutes")
      .select(MUTE_SELECT)
      .eq("agency_id", agencyId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as NotificationMute[];
  },

  async createMute(
    supabase: SupabaseClient,
    agencyId: string,
    userId: string,
    input: MuteInput,
  ): Promise<NotificationMute> {
    const { data, error } = await supabase
      .from("notification_mutes")
      .upsert(
        {
          agency_id: agencyId,
          user_id: userId,
          scope_type: input.scopeType,
          scope_key: input.scopeKey,
        },
        { onConflict: "user_id,scope_type,scope_key" },
      )
      .select(MUTE_SELECT)
      .single();
    if (error) throw error;
    return data as unknown as NotificationMute;
  },

  async deleteMute(
    supabase: SupabaseClient,
    agencyId: string,
    userId: string,
    input: MuteInput,
  ): Promise<void> {
    const { error } = await supabase
      .from("notification_mutes")
      .delete()
      .eq("agency_id", agencyId)
      .eq("user_id", userId)
      .eq("scope_type", input.scopeType)
      .eq("scope_key", input.scopeKey);
    if (error) throw error;
  },
};
