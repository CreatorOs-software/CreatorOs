import { getAuthContext } from "@/domains/auth";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { CommunicationRepository } from "./repository";
import type { InboxPageData, ThreadPatch } from "./types";

export class CommunicationError extends Error {}

export const CommunicationService = {
  async getInboxPageData(): Promise<InboxPageData> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return CommunicationRepository.findInboxPageData(supabase, agencyId);
  },

  async patchThread(id: string, patch: ThreadPatch): Promise<void> {
    const supabase = await createClient();
    await getAuthContext(supabase);
    return CommunicationRepository.patchThread(supabase, id, patch);
  },

  async replyToThread(threadId: string, body: string): Promise<void> {
    const supabase = await createClient();
    const { agencyId, displayName } = await getAuthContext(supabase);

    const thread = await CommunicationRepository.findThread(supabase, threadId);
    if (!thread) throw new CommunicationError("Thread not found");

    const integ = await CommunicationRepository.findSmtpIntegration(serviceClient, agencyId);
    if (!integ?.smtp_host || !integ.smtp_port)
      throw new CommunicationError("Kein Postfach mit SMTP konfiguriert.");
    if (!integ.imap_password)
      throw new CommunicationError("Postfach-Passwort fehlt.");

    const { SmtpClient } = await import("@/lib/smtp-client.server");
    const client = new SmtpClient({
      host: integ.smtp_host,
      port: integ.smtp_port,
      secure: integ.smtp_secure ?? true,
      username: integ.imap_username ?? integ.email,
      password: integ.imap_password,
    });

    const subject = thread.subject.toLowerCase().startsWith("re:")
      ? thread.subject
      : `Re: ${thread.subject}`;
    const inReplyTo = thread.gmail_thread_id?.startsWith("<") ? thread.gmail_thread_id : null;

    try {
      await client.connect();
      await client.login();
      await client.send({
        from: { name: integ.display_name ?? displayName ?? null, email: integ.email },
        to: [thread.sender_email],
        subject,
        text: body,
        inReplyTo,
        references: inReplyTo,
      });
      await client.quit();
    } finally {
      await client.close();
    }

    await CommunicationRepository.patchThread(supabase, threadId, { unread: false });

    await CommunicationRepository.insertSentThread(serviceClient, {
      agency_id: thread.agency_id,
      integration_id: integ.id,
      folder: "sent",
      sender_email: integ.email,
      sender_name: integ.display_name ?? displayName ?? null,
      subject,
      preview: body.slice(0, 240).replace(/\s+/g, " ").trim(),
      body,
      received_at: new Date().toISOString(),
      unread: false,
      starred: false,
      priority: "med",
    });
  },
};
