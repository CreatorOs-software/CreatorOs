import { z } from "zod";
import { toErrorResponse } from "@/domains/auth";
import { WhatsAppService, WhatsAppError } from "@/domains/whatsapp";

const schema = z.object({
  creatorId: z.string().uuid(),
  threadId: z.string().uuid().nullish(),
  body: z.string().trim().min(1, "Nachricht fehlt").max(1500),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
        { status: 400 },
      );
    }
    const { sid } = await WhatsAppService.sendToCreator(parsed.data);
    return Response.json({ ok: true, sid });
  } catch (e) {
    if (e instanceof WhatsAppError)
      return Response.json({ error: e.message }, { status: 400 });
    return toErrorResponse(e);
  }
}
