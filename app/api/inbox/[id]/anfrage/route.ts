import { z } from "zod";
import { CommunicationService, CommunicationError } from "@/domains/communication";
import { toErrorResponse } from "@/lib/auth-context";

const schema = z.object({ anfrage_id: z.string().min(1) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success)
      return Response.json({ error: "Ungültige Daten" }, { status: 400 });

    await CommunicationService.linkThreadToAnfrage(id, parsed.data.anfrage_id);
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof CommunicationError)
      return Response.json({ error: e.message }, { status: 400 });
    return toErrorResponse(e);
  }
}
