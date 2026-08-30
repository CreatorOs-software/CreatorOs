import { NextRequest } from "next/server";
import { z } from "zod";
import { toErrorResponse } from "@/domains/auth";
import { TemplateService } from "@/domains/templates";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  channel: z.enum(["email", "whatsapp", "general"]).optional(),
  subject: z.string().nullable().optional(),
  body: z.string().min(1).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success)
      return Response.json({ error: "Ungültige Daten" }, { status: 400 });

    const template = await TemplateService.update(id, parsed.data);
    return Response.json({ template });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await TemplateService.remove(id);
    return Response.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
