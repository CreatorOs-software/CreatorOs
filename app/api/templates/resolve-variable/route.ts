import { NextRequest } from "next/server";
import { z } from "zod";
import { toErrorResponse } from "@/domains/auth";
import { TemplateService } from "@/domains/templates";

const resolveSchema = z.object({
  path: z.string().min(1),
  threadId: z.string().uuid().optional(),
  integrationId: z.string().uuid().optional(),
  creatorId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = resolveSchema.safeParse(body);
    if (!parsed.success)
      return Response.json({ error: "Ungültige Daten" }, { status: 400 });

    const { path, ...input } = parsed.data;
    const result = await TemplateService.resolveVariable(path, input);
    return Response.json(result);
  } catch (e) {
    return toErrorResponse(e);
  }
}
