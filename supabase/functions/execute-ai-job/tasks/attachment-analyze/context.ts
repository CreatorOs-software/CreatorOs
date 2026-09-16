import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { buildAttachmentFileContext } from "../attachment-shared/context.ts";

export type AttachmentAnalyzeContext = {
  filename: string;
  mimeType: string;
  base64: string;
  agency: { creators: { id: string; full_name: string }[] };
};

export async function buildAttachmentAnalyzeContext(
  payload:  { email_attachment_id: string },
  agencyId: string,
  db:       SupabaseClient,
): Promise<AttachmentAnalyzeContext> {
  const [fileCtx, creatorsRes] = await Promise.all([
    buildAttachmentFileContext(payload, agencyId, db),
    db
      .from("creators")
      .select("id, full_name")
      .eq("agency_id", agencyId)
      .eq("status", "active")
      .limit(20),
  ]);

  return {
    ...fileCtx,
    agency: { creators: creatorsRes.data ?? [] },
  };
}
