import { getAuthContext } from "@/domains/auth";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { CommunicationRepository } from "./repository";
import type { EmailLabel, InboxPageData, ThreadPatch } from "./types";

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

  async createLabel(name: string, color: string): Promise<EmailLabel> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return CommunicationRepository.createLabel(supabase, agencyId, name, color);
  },

  async findOrCreateLabel(name: string, color: string): Promise<EmailLabel> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return CommunicationRepository.findOrCreateLabel(supabase, agencyId, name, color);
  },

  async deleteLabel(id: string): Promise<void> {
    const supabase = await createClient();
    await getAuthContext(supabase);
    return CommunicationRepository.deleteLabel(supabase, id);
  },

  async assignLabel(threadId: string, labelId: string): Promise<void> {
    const supabase = await createClient();
    await getAuthContext(supabase);
    return CommunicationRepository.assignLabel(supabase, threadId, labelId);
  },

  async removeLabel(threadId: string, labelId: string): Promise<void> {
    const supabase = await createClient();
    await getAuthContext(supabase);
    return CommunicationRepository.removeLabel(supabase, threadId, labelId);
  },

  async composeEmail(input: {
    to: string;
    subject: string;
    body: string;
    cc?: string;
    bcc?: string;
    integrationId?: string | null;
  }): Promise<void> {
    const supabase = await createClient();
    const { agencyId, displayName } = await getAuthContext(supabase);

    const integ = await CommunicationRepository.findSmtpIntegration(serviceClient, agencyId, input.integrationId);
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

    const toList = input.to.split(",").map((e) => e.trim()).filter(Boolean);
    const ccList = input.cc?.split(",").map((e) => e.trim()).filter(Boolean) ?? [];
    const bccList = input.bcc?.split(",").map((e) => e.trim()).filter(Boolean) ?? [];

    let messageId: string | null = null;
    try {
      await client.connect();
      await client.login();
      ({ messageId } = await client.send({
        from: { name: integ.display_name ?? displayName ?? null, email: integ.email },
        to: toList,
        cc: ccList.length ? ccList : undefined,
        bcc: bccList.length ? bccList : undefined,
        subject: input.subject,
        text: input.body,
      }));
      await client.quit();
    } finally {
      await client.close();
    }

    // best-effort — email is already delivered; a DB failure here must not cause the caller to retry and resend
    try {
      await CommunicationRepository.insertSentThread(serviceClient, {
        agency_id: agencyId,
        integration_id: integ.id,
        folder: "SENT",
        sender_email: integ.email,
        sender_name: integ.display_name ?? displayName ?? null,
        recipient_email: toList[0] ?? null,
        subject: input.subject,
        preview: input.body.slice(0, 240).replace(/\s+/g, " ").trim(),
        body: input.body,
        received_at: new Date().toISOString(),
        unread: false,
        starred: false,
        priority: "med",
        message_id: messageId,
      });
    } catch {}
  },

  async replyToThread(threadId: string, body: string, cc?: string[]): Promise<void> {
    const supabase = await createClient();
    const { agencyId, displayName } = await getAuthContext(supabase);

    const thread = await CommunicationRepository.findThread(supabase, threadId);
    if (!thread) throw new CommunicationError("Thread not found");

    const integ = await CommunicationRepository.findSmtpIntegration(serviceClient, agencyId, thread.integration_id);
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
    const parentMessageId =
      thread.message_id ??
      (thread.gmail_thread_id?.startsWith("<") ? thread.gmail_thread_id : null);
    const ccList = cc?.filter(Boolean) ?? [];

    let messageId: string | null = null;
    try {
      await client.connect();
      await client.login();
      ({ messageId } = await client.send({
        from: { name: integ.display_name ?? displayName ?? null, email: integ.email },
        to: [thread.sender_email],
        cc: ccList.length ? ccList : undefined,
        subject,
        text: body,
        inReplyTo: parentMessageId,
        references: parentMessageId,
      }));
      await client.quit();
    } finally {
      await client.close();
    }

    await CommunicationRepository.patchThread(supabase, threadId, { unread: false });

    // Ensure the reply lands in a conversation so the customer's answer to it gets grouped.
    const conversationId = await CommunicationRepository.ensureThreadConversation(supabase, {
      id: thread.id,
      agency_id: thread.agency_id,
      integration_id: thread.integration_id,
      subject: thread.subject,
      gmail_thread_id: thread.gmail_thread_id,
      conversation_id: thread.conversation_id,
    }).catch(() => thread.conversation_id ?? null);

    // best-effort — email is already delivered; a DB failure here must not cause the caller to retry and resend
    try {
      await CommunicationRepository.insertSentThread(serviceClient, {
        agency_id: thread.agency_id,
        integration_id: integ.id,
        folder: "SENT",
        sender_email: integ.email,
        sender_name: integ.display_name ?? displayName ?? null,
        recipient_email: thread.sender_email,
        subject,
        preview: body.slice(0, 240).replace(/\s+/g, " ").trim(),
        body,
        received_at: new Date().toISOString(),
        unread: false,
        starred: false,
        priority: "med",
        conversation_id: conversationId,
        message_id: messageId,
        in_reply_to: parentMessageId,
        references_header: parentMessageId,
      });
    } catch {}
  },

  async linkThreadToAnfrage(threadId: string, anfrageId: string): Promise<void> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);

    const thread = await CommunicationRepository.findThread(supabase, threadId);
    if (!thread) throw new CommunicationError("Thread not found");
    if (thread.agency_id !== agencyId) throw new CommunicationError("Kein Zugriff");

    const conversationId = await CommunicationRepository.ensureThreadConversation(supabase, {
      id: thread.id,
      agency_id: thread.agency_id,
      integration_id: thread.integration_id,
      subject: thread.subject,
      gmail_thread_id: thread.gmail_thread_id,
      conversation_id: thread.conversation_id,
    });

    await CommunicationRepository.setConversationAnfrage(
      supabase,
      conversationId,
      anfrageId,
      agencyId,
    );
  },
};
