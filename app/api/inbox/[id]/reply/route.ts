import { CommunicationService, CommunicationError } from "@/domains/communication";
import { toErrorResponse } from "@/lib/auth-context";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { body: replyBody } = await request.json();

    if (!replyBody?.trim())
      return Response.json({ error: "Empty reply" }, { status: 400 });

    await CommunicationService.replyToThread(id, replyBody);
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof CommunicationError)
      return Response.json({ error: e.message }, { status: 400 });
    return toErrorResponse(e);
  }
}
