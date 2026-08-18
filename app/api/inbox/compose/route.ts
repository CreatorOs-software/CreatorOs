import { CommunicationService, CommunicationError } from "@/domains/communication";
import { toErrorResponse } from "@/lib/auth-context";

export async function POST(request: Request) {
  try {
    const { to, subject, body, cc, bcc, integrationId } = await request.json();
    if (!to?.trim()) return Response.json({ error: "Empfänger fehlt" }, { status: 400 });
    if (!body?.trim()) return Response.json({ error: "Nachricht fehlt" }, { status: 400 });

    await CommunicationService.composeEmail({ to, subject: subject ?? "", body, cc, bcc, integrationId });
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof CommunicationError)
      return Response.json({ error: e.message }, { status: 400 });
    return toErrorResponse(e);
  }
}
