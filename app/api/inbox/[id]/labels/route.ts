import { CommunicationService } from "@/domains/communication";
import { toErrorResponse } from "@/lib/auth-context";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: threadId } = await params;
    const { labelId } = await request.json();
    if (!labelId) return Response.json({ error: "labelId fehlt" }, { status: 400 });
    await CommunicationService.assignLabel(threadId, labelId);
    return Response.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
