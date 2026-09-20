import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthContext } from "@/domains/auth";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { EmailAttachmentRepository } from "./repository";
import { copyAttachmentToCreatorDocuments } from "./creator-file-copy";
import type { AttachmentAnalyzeResult, EmailAttachment } from "./types";

const ATTACHMENTS_BUCKET = "email-attachments";
const DOWNLOAD_URL_TTL = 3600;

export class AttachmentError extends Error {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function callSyncGmail(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/sync-gmail`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new AttachmentError((data.error as string) ?? "sync-gmail request failed");
  return data;
}

async function callExecuteAiJob(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/execute-ai-job`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new AttachmentError((data.error as string) ?? "execute-ai-job request failed");
  return data;
}

// A thread only ever surfaces attachments for KI-analysis when it's
// actually deal-shaped — labeled ANFRAGE, directly linked to a Deal, or part
// of a conversation that already has an Anfrage. This is checked at read
// time (not cached at sync time) so a thread that becomes relevant later
// (label arrives, Anfrage gets linked) picks up its attachments retroactively.
async function isThreadRelevant(
  supabase: SupabaseClient,
  threadId: string,
  agencyId: string,
): Promise<boolean> {
  const { data: thread, error } = await supabase
    .from("email_threads")
    .select("system_labels, linked_deal_id, conversation_id")
    .eq("id", threadId)
    .eq("agency_id", agencyId)
    .maybeSingle<{ system_labels: string[] | null; linked_deal_id: string | null; conversation_id: string | null }>();
  if (error) throw error;
  if (!thread) return false;

  if (thread.system_labels?.includes("ANFRAGE")) return true;
  if (thread.linked_deal_id) return true;

  if (thread.conversation_id) {
    const { data: conversation, error: convErr } = await supabase
      .from("conversations")
      .select("anfrage_id")
      .eq("id", thread.conversation_id)
      .maybeSingle<{ anfrage_id: string | null }>();
    if (convErr) throw convErr;
    if (conversation?.anfrage_id) return true;
  }

  return false;
}

export const EmailAttachmentService = {
  async list(threadId: string): Promise<EmailAttachment[]> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);

    if (!(await isThreadRelevant(supabase, threadId, agencyId))) return [];

    const attachments = await EmailAttachmentRepository.findByThread(supabase, threadId, agencyId);
    return attachments.filter((a) => a.is_classifiable);
  },

  // Unlike list(), not gated by thread relevance — a human opening an
  // attachment they can already see in the email costs nothing and carries
  // none of the AI-spend risk that list()/analyze() guard against.
  async listRaw(threadId: string): Promise<EmailAttachment[]> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return EmailAttachmentRepository.findByThread(supabase, threadId, agencyId);
  },

  async ensureFetched(attachment: EmailAttachment, agencyId: string): Promise<string> {
    if (attachment.storage_path) return attachment.storage_path;
    const supabase = await createClient();
    const result = await callSyncGmail({ action: "fetch_attachment", email_attachment_id: attachment.id });
    const storagePath = result.storage_path as string;
    await EmailAttachmentRepository.markStoragePath(supabase, attachment.id, agencyId, storagePath);
    return storagePath;
  },

  // Only ever called from an explicit click on a chosen attachment card —
  // never automatically, and never for a thread that isn't relevant.
  async analyze(attachment: EmailAttachment, agencyId: string): Promise<AttachmentAnalyzeResult> {
    const supabase = await createClient();
    if (!(await isThreadRelevant(supabase, attachment.email_thread_id, agencyId))) {
      throw new AttachmentError("Thread ist nicht relevant für Anhang-Analyse");
    }

    await this.ensureFetched(attachment, agencyId);
    const result = (await callExecuteAiJob({
      mode: "analyze-attachment",
      agency_id: agencyId,
      email_attachment_id: attachment.id,
    })) as unknown as AttachmentAnalyzeResult;

    await EmailAttachmentRepository.recordAnalysis(supabase, attachment.id, agencyId, result);
    return result;
  },

  // Files a RECHNUNG attachment under the Creator's existing document area
  // instead of extracting deal fields from it.
  async assignToCreator(attachment: EmailAttachment, agencyId: string, creatorId: string): Promise<void> {
    const storagePath = await this.ensureFetched(attachment, agencyId);
    await copyAttachmentToCreatorDocuments({
      agencyId,
      creatorId,
      attachmentStoragePath: storagePath,
      filename: attachment.filename,
      mimeType: attachment.mime_type,
    });

    const supabase = await createClient();
    await EmailAttachmentRepository.recordCreatorAssignment(supabase, attachment.id, agencyId, creatorId);
  },

  // Lets the user open the raw file themselves — fetches bytes if this is
  // the first time (Gmail lazy-fetch), then signs a short-lived URL against
  // the private bucket.
  async getDownloadUrl(attachment: EmailAttachment, agencyId: string): Promise<string> {
    const storagePath = await this.ensureFetched(attachment, agencyId);
    const { data, error } = await serviceClient.storage
      .from(ATTACHMENTS_BUCKET)
      .createSignedUrl(storagePath, DOWNLOAD_URL_TTL);
    if (error || !data?.signedUrl) {
      throw new AttachmentError(error?.message ?? "Download-Link konnte nicht erstellt werden");
    }
    return data.signedUrl;
  },
};
