import { z } from "zod";
import { toErrorResponse } from "@/domains/auth";
import { WhatsAppService, WhatsAppError } from "@/domains/whatsapp";

const schema = z.object({
  creatorId: z.string().uuid(),
  threadId: z.string().uuid().nullish(),
  body: z.string().trim().max(4096).optional(),
  templateName: z.string().regex(/^[a-z0-9_]+$/).optional(),
  templateParams: z.array(z.string().max(1024)).max(10).optional(),
}).refine((value) => value.body || value.templateName, {
  message: "Nachricht oder Vorlage fehlt",
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
    const { messageId } = await WhatsAppService.sendToCreator(parsed.data);
    return Response.json({ ok: true, messageId });
  } catch (e) {
    if (e instanceof WhatsAppError)
      return Response.json({ error: e.message }, { status: 400 });
    return toErrorResponse(e);
  }
}
