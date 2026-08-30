import { NextRequest } from "next/server";
import { z } from "zod";
import { toErrorResponse } from "@/lib/auth-context";
import { BrandService } from "@/domains/brands";

const createSchema = z.object({
  company_name: z.string().min(1),
  short_code: z.string().min(1).max(4),
  industry: z.string().nullable().optional(),
});

export async function GET(_req: NextRequest) {
  try {
    const brands = await BrandService.listBrands();
    return Response.json({ brands });
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

    const brand = await BrandService.createBrand(parsed.data);
    return Response.json({ brand }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
