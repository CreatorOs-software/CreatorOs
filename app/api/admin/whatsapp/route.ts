import { z } from "zod";
import { toErrorResponse } from "@/domains/auth";
import { WhatsAppService, WhatsAppError } from "@/domains/whatsapp";

const connectSchema = z.object({
  accountSid: z.string().startsWith("AC").min(30),
  authToken: z.string().min(20),
  fromNumber: z.string().regex(/^\+[1-9]\d{6,14}$/, "E.164 erwartet, z. B. +4915112345678"),
  contentSid: z.string().startsWith("HX").min(30),
  templateName: z.string().optional(),
  messagingServiceSid: z.string().startsWith("MG").optional(),
});

const testSchema = z.object({
  toNumber: z.string().regex(/^\+[1-9]\d{6,14}$/, "E.164 erwartet"),
});

function badRequest(error: z.ZodError): Response {
  return Response.json(
    { error: error.issues[0]?.message ?? "Ungültige Eingabe" },
    { status: 400 },
  );
}

export async function GET() {
  try {
    return Response.json({ connection: await WhatsAppService.getConnection() });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const payload = await request.json();

    if (url.searchParams.get("action") === "test") {
      const parsed = testSchema.safeParse(payload);
      if (!parsed.success) return badRequest(parsed.error);
      const { sid } = await WhatsAppService.sendTest(parsed.data.toNumber);
      return Response.json({ ok: true, sid });
    }

    const parsed = connectSchema.safeParse(payload);
    if (!parsed.success) return badRequest(parsed.error);
    return Response.json({ connection: await WhatsAppService.connect(parsed.data) });
  } catch (e) {
    if (e instanceof WhatsAppError)
      return Response.json({ error: e.message }, { status: 400 });
    return toErrorResponse(e);
  }
}

export async function DELETE() {
  try {
    await WhatsAppService.disconnect();
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof WhatsAppError)
      return Response.json({ error: e.message }, { status: 400 });
    return toErrorResponse(e);
  }
}
