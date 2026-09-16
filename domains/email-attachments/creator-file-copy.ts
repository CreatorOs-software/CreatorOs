import { serviceClient } from "@/lib/supabase/service";

const CREATOR_DOCUMENTS_BUCKET = "creator-documents";
const EMAIL_ATTACHMENTS_BUCKET = "email-attachments";

// Replicates the path/metadata convention of app/api/creators/[id]/documents/route.ts
// (creator-documents has no DB table — an "entry" is purely a Storage object
// with originalName/size/mimetype in its metadata).
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function copyAttachmentToCreatorDocuments(params: {
  agencyId: string;
  creatorId: string;
  attachmentStoragePath: string;
  filename: string;
  mimeType: string;
}): Promise<void> {
  const { agencyId, creatorId, attachmentStoragePath, filename, mimeType } = params;

  const { data: fileBlob, error: dlErr } = await serviceClient.storage
    .from(EMAIL_ATTACHMENTS_BUCKET)
    .download(attachmentStoragePath);
  if (dlErr) throw new Error(`download from email-attachments failed: ${dlErr.message}`);

  const bytes = await fileBlob.arrayBuffer();
  const safeName = `${Date.now()}-${sanitizeFilename(filename)}`;
  const path = `${agencyId}/${creatorId}/${safeName}`;

  const { error: uploadErr } = await serviceClient.storage
    .from(CREATOR_DOCUMENTS_BUCKET)
    .upload(path, bytes, {
      contentType: mimeType,
      metadata: { originalName: filename, size: bytes.byteLength, mimetype: mimeType },
    });
  if (uploadErr) throw new Error(`upload to creator-documents failed: ${uploadErr.message}`);
}
