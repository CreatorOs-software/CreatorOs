import { NextRequest } from "next/server";
import { z } from "zod";
import { toErrorResponse } from "@/lib/auth-context";
import { BrandService } from "@/domains/brands";

const createSchema = z.object({
  name: z.string().min(1),
  role: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const contacts = await BrandService.getContacts(id);
    return Response.json({ contacts });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success)
      return Response.json({ error: "Ungültige Daten" }, { status: 400 });

    const contact = await BrandService.createContact(id, parsed.data);
    return Response.json({ contact }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
