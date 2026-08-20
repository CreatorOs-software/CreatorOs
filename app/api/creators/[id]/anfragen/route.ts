import { NextRequest } from "next/server";
import { z } from "zod";
import { toErrorResponse } from "@/lib/auth-context";
import { AnfrageService } from "@/domains/anfragen";

const postSchema = z.object({
  brand_id: z.string().nullable().optional(),
  brand_name: z.string().nullable().optional(),
  contact_person: z.string().nullable().optional(),
  format: z.string().nullable().optional(),
  budget_requested: z.number().nullable().optional(),
  budget_offer: z.number().nullable().optional(),
  source: z.enum(["email", "ig_dm", "whatsapp", "manual"]).default("manual"),
  notes: z.string().nullable().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: creatorId } = await params;
    const anfragen = await AnfrageService.getAnfragenByCreator(creatorId);
    return Response.json({ anfragen });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: creatorId } = await params;
    const body = await req.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Ungültige Daten" }, { status: 400 });
    }
    const anfrage = await AnfrageService.createAnfrage(creatorId, parsed.data);
    return Response.json({ anfrage }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
