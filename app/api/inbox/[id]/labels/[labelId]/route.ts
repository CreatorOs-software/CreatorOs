import { CommunicationService } from "@/domains/communication";
import { toErrorResponse } from "@/lib/auth-context";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; labelId: string }> }) {
  try {
    const { id: threadId, labelId } = await params;
    await CommunicationService.removeLabel(threadId, labelId);
    return Response.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
