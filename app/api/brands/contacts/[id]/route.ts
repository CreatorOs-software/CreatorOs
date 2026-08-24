import { NextRequest } from "next/server";
import { z } from "zod";
import { toErrorResponse } from "@/lib/auth-context";
import { BrandService } from "@/domains/brands";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
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

    const contact = await BrandService.updateContact(id, parsed.data);
    return Response.json({ contact });
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
    await BrandService.deleteContact(id);
    return Response.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
