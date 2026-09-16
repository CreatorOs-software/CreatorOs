import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AttachmentAnalyzeResult,
  EmailAttachment,
} from "./types";

const ATTACHMENT_SELECT =
  "id, email_thread_id, filename, mime_type, size_bytes, is_classifiable, storage_path, classification, classification_confidence, extracted, analysed_at, assigned_creator_id, assigned_at";

export const EmailAttachmentRepository = {
  async findByThread(
    supabase: SupabaseClient,
    threadId: string,
    agencyId: string,
  ): Promise<EmailAttachment[]> {
    const { data, error } = await supabase
      .from("email_attachments")
      .select(ATTACHMENT_SELECT)
      .eq("email_thread_id", threadId)
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as EmailAttachment[];
  },

  async findById(
    supabase: SupabaseClient,
    id: string,
    agencyId: string,
  ): Promise<EmailAttachment | null> {
    const { data, error } = await supabase
      .from("email_attachments")
      .select(ATTACHMENT_SELECT)
      .eq("id", id)
      .eq("agency_id", agencyId)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as unknown as EmailAttachment | null;
  },

  async markStoragePath(
    supabase: SupabaseClient,
    id: string,
    agencyId: string,
    storagePath: string,
  ): Promise<void> {
    const { error } = await supabase
      .from("email_attachments")
      .update({ storage_path: storagePath })
      .eq("id", id)
      .eq("agency_id", agencyId);
    if (error) throw error;
  },

  async recordAnalysis(
    supabase: SupabaseClient,
    id: string,
    agencyId: string,
    result: AttachmentAnalyzeResult,
  ): Promise<void> {
    const { error } = await supabase
      .from("email_attachments")
      .update({
        classification: result.classification,
        classification_confidence: result.classification_confidence,
        extracted: result.extracted,
        analysed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("agency_id", agencyId);
    if (error) throw error;
  },

  async recordCreatorAssignment(
    supabase: SupabaseClient,
    id: string,
    agencyId: string,
    creatorId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from("email_attachments")
      .update({ assigned_creator_id: creatorId, assigned_at: new Date().toISOString() })
      .eq("id", id)
      .eq("agency_id", agencyId);
    if (error) throw error;
  },
};
