import { getAuthContext } from "@/domains/auth";
import { createClient } from "@/lib/supabase/server";
import { toErrorResponse } from "@/lib/auth-context";
import { EmailAttachmentService } from "@/domains/email-attachments";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);

    const { data: thread, error } = await supabase
      .from("email_threads")
      .select("id")
      .eq("id", id)
      .eq("agency_id", agencyId)
      .single();
    if (error || !thread) {
      return Response.json({ error: "Thread not found" }, { status: 404 });
    }

    const attachments = await EmailAttachmentService.list(id);
    return Response.json({ attachments });
  } catch (e) {
    return toErrorResponse(e);
  }
}
