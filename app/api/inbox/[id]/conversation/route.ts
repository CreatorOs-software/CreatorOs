import { CommunicationRepository } from "@/domains/communication/repository";
import { getAuthContext } from "@/domains/auth";
import { createClient } from "@/lib/supabase/server";
import { toErrorResponse } from "@/lib/auth-context";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);

    const thread = await CommunicationRepository.findThread(supabase, id);
    if (!thread || thread.agency_id !== agencyId) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    if (!thread.conversation_id) {
      return Response.json({ messages: [] });
    }

    const messages = await CommunicationRepository.findConversationMessages(
      supabase,
      thread.conversation_id,
      agencyId,
      id,
    );

    return Response.json({ messages });
  } catch (e) {
    return toErrorResponse(e);
  }
}
