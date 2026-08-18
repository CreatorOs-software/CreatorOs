import { CommunicationService } from "@/domains/communication";
import { toErrorResponse } from "@/lib/auth-context";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await CommunicationService.deleteLabel(id);
    return Response.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
