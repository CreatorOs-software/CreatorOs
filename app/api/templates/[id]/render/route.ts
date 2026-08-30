import { NextRequest } from "next/server";
import { z } from "zod";
import { toErrorResponse } from "@/domains/auth";
import { TemplateService } from "@/domains/templates";

const renderSchema = z.object({
  threadId: z.string().uuid().optional(),
  integrationId: z.string().uuid().optional(),
  creatorId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = renderSchema.safeParse(body);
    if (!parsed.success)
      return Response.json({ error: "Ungültige Daten" }, { status: 400 });

    const result = await TemplateService.render(id, parsed.data);
    return Response.json(result);
  } catch (e) {
    return toErrorResponse(e);
  }
}
