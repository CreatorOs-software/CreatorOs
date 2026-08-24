import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  EmailLabel,
  EmailThread,
  InboxCreator,
  InboxIntegration,
  InboxPageData,
  SmtpIntegration,
  ThreadPatch,
} from "./types";

export const CommunicationRepository = {
  async findInboxPageData(
    supabase: SupabaseClient,
    agencyId: string,
  ): Promise<InboxPageData> {
    const [threadsRes, integrationsRes, creatorsRes, labelsRes] = await Promise.all([
      supabase
        .from("email_threads")
        .select(
          "id, agency_id, sender_email, sender_name, recipient_email, subject, preview, body, body_html, received_at, unread, starred, priority, integration_id, folder, gmail_thread_id, system_labels, label_status, conversation_id, message_id, in_reply_to, references_header, thread_labels:email_thread_labels(label:email_labels(id, name, color))",
        )
        .eq("agency_id", agencyId)
        .order("received_at", { ascending: false })
        .limit(100),
      supabase
        .from("email_integrations")
        .select("id, email, display_name, provider, status, creator_id, auto_label")
        .eq("agency_id", agencyId)
        .eq("status", "connected"),
      supabase
        .from("creators")
        .select("id, full_name, initials")
        .eq("agency_id", agencyId),
      supabase
        .from("email_labels")
        .select("id, name, color")
        .eq("agency_id", agencyId)
        .order("name"),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const threads = (threadsRes.data ?? []).map((row: any) => ({
      ...row,
      labels: (row.thread_labels ?? []).map((tl: { label: EmailLabel | null }) => tl.label).filter(Boolean),
      thread_labels: undefined,
    })) as EmailThread[];

    return {
      threads,
      integrations: (integrationsRes.data ?? []) as InboxIntegration[],
      creators: (creatorsRes.data ?? []) as InboxCreator[],
      labels: (labelsRes.data ?? []) as EmailLabel[],
    };
  },

  async patchThread(
    supabase: SupabaseClient,
    id: string,
    patch: ThreadPatch,
  ): Promise<void> {
    const { error } = await supabase
      .from("email_threads")
      .update(patch)
      .eq("id", id);

    if (error) throw new Error(error.message);
  },

  async findThread(
    supabase: SupabaseClient,
    id: string,
  ): Promise<Pick<EmailThread, "id" | "agency_id" | "sender_email" | "subject" | "gmail_thread_id" | "integration_id" | "conversation_id"> | null> {
    const { data } = await supabase
      .from("email_threads")
      .select("id, agency_id, sender_email, sender_name, subject, gmail_thread_id, integration_id, conversation_id")
      .eq("id", id)
      .maybeSingle();

    return data ?? null;
  },

  async findConversationMessages(
    supabase: SupabaseClient,
    conversationId: string,
    agencyId: string,
    excludeThreadId: string,
  ): Promise<EmailThread[]> {
    const { data, error } = await supabase
      .from("email_threads")
      .select(
        "id, agency_id, sender_email, sender_name, recipient_email, subject, preview, body, body_html, received_at, unread, starred, priority, integration_id, folder, gmail_thread_id, system_labels, label_status, conversation_id, message_id, in_reply_to, references_header, thread_labels:email_thread_labels(label:email_labels(id, name, color))",
      )
      .eq("conversation_id", conversationId)
      .eq("agency_id", agencyId)
      .neq("id", excludeThreadId)
      .order("received_at", { ascending: true });

    if (error) throw new Error(error.message);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((row: any) => ({
      ...row,
      labels: (row.thread_labels ?? []).map((tl: { label: EmailLabel | null }) => tl.label).filter(Boolean),
      thread_labels: undefined,
    })) as EmailThread[];
  },

  async findSmtpIntegration(
    supabase: SupabaseClient,
    agencyId: string,
    integrationId?: string | null,
  ): Promise<SmtpIntegration | null> {
    let q = supabase
      .from("email_integrations")
      .select(
        "id, email, display_name, smtp_host, smtp_port, smtp_secure, imap_username, imap_password",
      )
      .eq("agency_id", agencyId)
      .eq("status", "connected")
      .not("smtp_host", "is", null);

    if (integrationId) {
      q = q.eq("id", integrationId);
    } else {
      q = q.order("connected_at", { ascending: false }).limit(1);
    }

    const { data } = await q.maybeSingle();
    return (data as SmtpIntegration | null) ?? null;
  },

  // ── Label CRUD ────────────────────────────────────────────────────────────────

  async createLabel(
    supabase: SupabaseClient,
    agencyId: string,
    name: string,
    color: string,
  ): Promise<EmailLabel> {
    const { data, error } = await supabase
      .from("email_labels")
      .insert({ agency_id: agencyId, name, color })
      .select("id, name, color")
      .single();
    if (error) throw new Error(error.message);
    return data as EmailLabel;
  },

  async findOrCreateLabel(
    supabase: SupabaseClient,
    agencyId: string,
    name: string,
    color: string,
  ): Promise<EmailLabel> {
    const { data, error } = await supabase
      .from("email_labels")
      .upsert(
        { agency_id: agencyId, name, color },
        { onConflict: "agency_id,name" },
      )
      .select("id, name, color")
      .single();
    if (error) throw new Error(error.message);
    return data as EmailLabel;
  },

  async deleteLabel(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from("email_labels").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  // ── Thread-label assignment ───────────────────────────────────────────────────

  async assignLabel(supabase: SupabaseClient, threadId: string, labelId: string): Promise<void> {
    const { error } = await supabase
      .from("email_thread_labels")
      .upsert({ thread_id: threadId, label_id: labelId }, { onConflict: "thread_id,label_id" });
    if (error) throw new Error(error.message);
  },

  async removeLabel(supabase: SupabaseClient, threadId: string, labelId: string): Promise<void> {
    const { error } = await supabase
      .from("email_thread_labels")
      .delete()
      .eq("thread_id", threadId)
      .eq("label_id", labelId);
    if (error) throw new Error(error.message);
  },

  // ─────────────────────────────────────────────────────────────────────────────

  async insertSentThread(
    supabase: SupabaseClient,
    row: {
      agency_id: string;
      integration_id: string;
      folder: string;
      sender_email: string;
      sender_name: string | null;
      recipient_email: string | null;
      subject: string;
      preview: string;
      body: string;
      received_at: string;
      unread: boolean;
      starred: boolean;
      priority: string;
      conversation_id?: string | null;
    },
  ): Promise<void> {
    const { error } = await supabase.from("email_threads").insert(row);
    if (error) throw new Error(error.message);
  },
};
