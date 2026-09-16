import { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type AttachmentFileContext = {
  filename: string;
  mimeType: string;
  base64: string;
};

// btoa() chokes on large binary buffers passed as a single string; encode in
// chunks instead.
function encodeBase64(bytes: Uint8Array): string {
  const CHUNK_SIZE = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE));
  }
  return btoa(binary);
}

export async function buildAttachmentFileContext(
  payload:  { email_attachment_id: string },
  agencyId: string,
  db:       SupabaseClient,
): Promise<AttachmentFileContext> {
  const { data: att, error } = await db
    .from("email_attachments")
    .select("filename, mime_type, storage_path")
    .eq("id", payload.email_attachment_id)
    .eq("agency_id", agencyId)
    .single();
  if (error) throw new Error(`context: email_attachments – ${error.message}`);
  if (!att.storage_path) throw new Error("attachment bytes not fetched yet");

  const { data: fileBlob, error: dlErr } = await db.storage
    .from("email-attachments")
    .download(att.storage_path);
  if (dlErr) throw new Error(`storage download: ${dlErr.message}`);

  const bytes = new Uint8Array(await fileBlob.arrayBuffer());

  return {
    filename: att.filename,
    mimeType: att.mime_type,
    base64: encodeBase64(bytes),
  };
}
