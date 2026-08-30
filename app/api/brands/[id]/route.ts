import { NextRequest } from "next/server";
import { z } from "zod";
import { toErrorResponse } from "@/lib/auth-context";
import { BrandService } from "@/domains/brands";

const patchSchema = z.object({
  company_name: z.string().min(1).optional(),
  short_code: z.string().min(1).max(4).optional(),
  industry: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const detail = await BrandService.getBrand(id);
    return Response.json(detail);
  } catch (e) {
    return toErrorResponse(e);
  }
}

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

    const brand = await BrandService.updateBrand(id, parsed.data);
    return Response.json({ brand });
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
    await BrandService.deleteBrand(id);
    return Response.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
