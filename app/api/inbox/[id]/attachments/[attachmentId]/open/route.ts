import { getAuthContext } from "@/domains/auth";
import { createClient } from "@/lib/supabase/server";
import { toErrorResponse } from "@/lib/auth-context";
import { EmailAttachmentService, AttachmentError } from "@/domains/email-attachments";

// Plain <a href> target: fetches bytes lazily if needed, then redirects to a
// short-lived signed URL so the browser opens/downloads the file natively.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  try {
    const { id, attachmentId } = await params;
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);

    const { data: thread, error: threadErr } = await supabase
      .from("email_threads")
      .select("id")
      .eq("id", id)
      .eq("agency_id", agencyId)
      .single();
    if (threadErr || !thread) {
      return Response.json({ error: "Thread not found" }, { status: 404 });
    }

    const attachments = await EmailAttachmentService.listRaw(id);
    const attachment = attachments.find((a) => a.id === attachmentId);
    if (!attachment) {
      return Response.json({ error: "Attachment not found" }, { status: 404 });
    }

    const url = await EmailAttachmentService.getDownloadUrl(attachment, agencyId);
    return Response.redirect(url);
  } catch (e) {
    if (e instanceof AttachmentError) {
      return Response.json({ error: e.message }, { status: 400 });
    }
    return toErrorResponse(e);
  }
}
