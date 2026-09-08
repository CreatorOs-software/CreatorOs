import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ConversationMessage,
  EmailLabel,
  EmailThread,
  EmailThreadBody,
  InboxCreator,
  InboxFilters,
  InboxIntegration,
  InboxPageData,
  SmtpIntegration,
  ThreadPatch,
} from "./types";

// Nur die Felder, die die Listenansicht wirklich rendert bzw. filtert.
// Kein `body`/`body_html` — die machen ~40 kB pro Zeile aus und trieben den
// Supabase-Egress hoch. Eingebettete Relationen (Labels, verknüpfte Anfrage)
// liefern nur schmale Spalten.
const THREAD_LIST_COLUMNS =
  "id, integration_id, folder, sender_email, sender_name, recipient_email, subject, preview, received_at, unread, starred, priority, system_labels, label_status, conversation_id, conversation:conversations(anfrage_id, anfrage:anfragen(linked_deal_id)), thread_labels:email_thread_labels(label:email_labels(id, name, color))";

const THREAD_LIST_LIMIT = 30;
const CONVERSATION_MESSAGE_LIMIT = 30;

export const CommunicationRepository = {
  async findInboxPageData(
    supabase: SupabaseClient,
    agencyId: string,
    filters: InboxFilters = {},
  ): Promise<InboxPageData> {
    let threadsQuery = supabase
        .from("email_threads")
        .select(THREAD_LIST_COLUMNS)
        .eq("agency_id", agencyId)
        .order("received_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(THREAD_LIST_LIMIT);

    if (filters.integrationId) threadsQuery = threadsQuery.eq("integration_id", filters.integrationId);
    if (filters.folder) threadsQuery = threadsQuery.eq("folder", filters.folder);
    if (filters.unread) threadsQuery = threadsQuery.eq("unread", true);
    if (filters.category === "important") threadsQuery = threadsQuery.eq("starred", true);
    else if (filters.category && filters.category !== "all") {
      threadsQuery = threadsQuery.contains("system_labels", [filters.category]);
    }
    if (filters.search) {
      threadsQuery = threadsQuery.textSearch("search_vector", filters.search, {
        config: "simple",
        type: "websearch",
      });
    }
    if (filters.labelId) {
      const { data: matches, error } = await supabase
        .from("email_thread_labels")
        .select("thread_id")
        .eq("label_id", filters.labelId);
      if (error) throw new Error(error.message);
      const ids = (matches ?? []).map((row) => row.thread_id);
      if (ids.length === 0) {
        threadsQuery = threadsQuery.in("id", ["00000000-0000-0000-0000-000000000000"]);
      } else {
        threadsQuery = threadsQuery.in("id", ids);
      }
    }

    let unreadQuery = supabase
      .from("email_threads")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .eq("folder", "INBOX")
      .eq("unread", true);
    if (filters.integrationId) unreadQuery = unreadQuery.eq("integration_id", filters.integrationId);

    const [threadsRes, integrationsRes, creatorsRes, labelsRes, unreadRes] = await Promise.all([
      threadsQuery,
      supabase
        .from("email_integrations")
        .select("id, email, display_name, provider, status, creator_id, auto_label")
        .eq("agency_id", agencyId)
        // Keep a mailbox visible during a transient sync error — only a
        // deliberate disconnect ('disconnected') removes it from the Inbox.
        .in("status", ["connected", "error"]),
      supabase
        .from("creators")
        .select("id, full_name, initials, phone")
        .eq("agency_id", agencyId),
      supabase
        .from("email_labels")
        .select("id, name, color")
        .eq("agency_id", agencyId)
        .order("name"),
      unreadQuery,
    ]);

    if (threadsRes.error) throw new Error(threadsRes.error.message);
    if (unreadRes.error) throw new Error(unreadRes.error.message);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const threads = (threadsRes.data ?? []).map((row: any) => ({
      ...row,
      labels: (row.thread_labels ?? []).map((tl: { label: EmailLabel | null }) => tl.label).filter(Boolean),
      anfrage_id: row.conversation?.anfrage_id ?? null,
      deal_id: row.conversation?.anfrage?.linked_deal_id ?? null,
      thread_labels: undefined,
      conversation: undefined,
    })) as EmailThread[];

    return {
      threads,
      integrations: (integrationsRes.data ?? []) as InboxIntegration[],
      creators: (creatorsRes.data ?? []) as InboxCreator[],
      labels: (labelsRes.data ?? []) as EmailLabel[],
      unreadCount: unreadRes.count ?? 0,
    };
  },

  /** Ungelesen-Zähler für das Sidebar-Badge — nur `count`, keine Zeilen (`head: true`). */
  async countUnreadInbox(
    supabase: SupabaseClient,
    agencyId: string,
  ): Promise<number> {
    const { count, error } = await supabase
      .from("email_threads")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .eq("unread", true)
      .eq("folder", "INBOX");

    if (error) throw new Error(error.message);
    return count ?? 0;
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
  ): Promise<Pick<EmailThread, "id" | "agency_id" | "sender_email" | "subject" | "gmail_thread_id" | "integration_id" | "conversation_id" | "message_id"> | null> {
    const { data } = await supabase
      .from("email_threads")
      .select("id, agency_id, sender_email, sender_name, subject, gmail_thread_id, integration_id, conversation_id, message_id")
      .eq("id", id)
      .maybeSingle();

    return data ?? null;
  },

  /** Returns the thread's conversation_id, creating a conversation and linking the thread if none exists yet. */
  async ensureThreadConversation(
    supabase: SupabaseClient,
    thread: {
      id: string;
      agency_id: string;
      integration_id: string;
      subject: string;
      gmail_thread_id: string | null;
      conversation_id: string | null;
    },
  ): Promise<string> {
    if (thread.conversation_id) return thread.conversation_id;

    const canonical = thread.subject.replace(/^(Re|Fwd|Fw|Aw|Antwort):\s*/gi, "").trim();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("conversations")
      .insert({
        agency_id: thread.agency_id,
        integration_id: thread.integration_id,
        provider_thread_id: thread.gmail_thread_id,
        subject_canonical: canonical || thread.subject,
        first_email_at: now,
        last_email_at: now,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await supabase
      .from("email_threads")
      .update({ conversation_id: data.id })
      .eq("id", thread.id);

    return data.id as string;
  },

  async setConversationAnfrage(
    supabase: SupabaseClient,
    conversationId: string,
    anfrageId: string,
    agencyId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from("conversations")
      .update({ anfrage_id: anfrageId })
      .eq("id", conversationId)
      .eq("agency_id", agencyId);
    if (error) throw new Error(error.message);
  },

  /** Full thread body — loaded only when the user opens a single email. Exactly one row. */
  async findThreadBody(
    supabase: SupabaseClient,
    id: string,
    agencyId: string,
  ): Promise<EmailThreadBody | null> {
    const { data, error } = await supabase
      .from("email_threads")
      .select("id, sender_email, sender_name, subject, body, body_html, received_at")
      .eq("id", id)
      .eq("agency_id", agencyId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (data as EmailThreadBody | null) ?? null;
  },

  async findConversationMessages(
    supabase: SupabaseClient,
    conversationId: string,
    agencyId: string,
    excludeThreadId: string,
  ): Promise<ConversationMessage[]> {
    const { data, error } = await supabase
      .from("email_threads")
      .select("id, sender_email, sender_name, received_at, preview, body, body_html")
      .eq("conversation_id", conversationId)
      .eq("agency_id", agencyId)
      .neq("id", excludeThreadId)
      .order("received_at", { ascending: true })
      .limit(CONVERSATION_MESSAGE_LIMIT);

    if (error) throw new Error(error.message);

    return (data ?? []) as ConversationMessage[];
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
      message_id?: string | null;
      in_reply_to?: string | null;
      references_header?: string | null;
    },
  ): Promise<void> {
    const { error } = await supabase.from("email_threads").insert(row);
    if (error) throw new Error(error.message);
  },
};
