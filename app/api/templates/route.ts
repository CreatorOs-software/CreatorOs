import { NextRequest } from "next/server";
import { z } from "zod";
import { toErrorResponse } from "@/domains/auth";
import { TemplateService } from "@/domains/templates";

const createSchema = z.object({
  name: z.string().min(1),
  channel: z.enum(["email", "whatsapp", "general"]),
  subject: z.string().nullable().optional(),
  body: z.string().min(1),
});

export async function GET() {
  try {
    const templates = await TemplateService.list();
    return Response.json({ templates });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success)
      return Response.json({ error: "Ungültige Daten" }, { status: 400 });

    const template = await TemplateService.create(parsed.data);
    return Response.json({ template }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
