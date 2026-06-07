import type { SupabaseClient } from "@supabase/supabase-js";
import type {
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
    const [threadsRes, integrationsRes, creatorsRes] = await Promise.all([
      supabase
        .from("email_threads")
        .select(
          "id, sender_email, sender_name, subject, preview, body, body_html, received_at, unread, starred, priority, integration_id, folder, gmail_thread_id",
        )
        .eq("agency_id", agencyId)
        .order("received_at", { ascending: false })
        .limit(100),
      supabase
        .from("email_integrations")
        .select("id, email, display_name, provider, status, creator_id")
        .eq("agency_id", agencyId)
        .eq("status", "connected"),
      supabase
        .from("creators")
        .select("id, full_name, initials, color")
        .eq("agency_id", agencyId),
    ]);

    return {
      threads: (threadsRes.data ?? []) as EmailThread[],
      integrations: (integrationsRes.data ?? []) as InboxIntegration[],
      creators: (creatorsRes.data ?? []) as InboxCreator[],
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
  ): Promise<Pick<EmailThread, "id" | "agency_id" | "sender_email" | "subject" | "gmail_thread_id"> | null> {
    const { data } = await supabase
      .from("email_threads")
      .select("id, agency_id, sender_email, sender_name, subject, gmail_thread_id")
      .eq("id", id)
      .maybeSingle();

    return data ?? null;
  },

  async findSmtpIntegration(
    supabase: SupabaseClient,
    agencyId: string,
  ): Promise<SmtpIntegration | null> {
    const { data } = await supabase
      .from("email_integrations")
      .select(
        "id, email, display_name, smtp_host, smtp_port, smtp_secure, imap_username, imap_password",
      )
      .eq("agency_id", agencyId)
      .eq("status", "connected")
      .not("smtp_host", "is", null)
      .order("connected_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return (data as SmtpIntegration | null) ?? null;
  },

  async insertSentThread(
    supabase: SupabaseClient,
    row: {
      agency_id: string;
      integration_id: string;
      folder: string;
      sender_email: string;
      sender_name: string | null;
      subject: string;
      preview: string;
      body: string;
      received_at: string;
      unread: boolean;
      starred: boolean;
      priority: string;
    },
  ): Promise<void> {
    const { error } = await supabase.from("email_threads").insert(row);
    if (error) throw new Error(error.message);
  },
};
