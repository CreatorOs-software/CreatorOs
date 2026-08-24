import { NextRequest } from "next/server";
import { z } from "zod";
import { toErrorResponse } from "@/lib/auth-context";
import { AnfrageService } from "@/domains/anfragen";

const deliverableSchema = z.object({
  count: z.number().min(1),
  content_type: z.string().min(1),
  platform: z.string().min(1),
  draft_deadline: z.string().nullable().optional(),
  freigabe_deadline: z.string().nullable().optional(),
  live_date: z.string().nullable().optional(),
  rights: z.record(z.string(), z.unknown()).nullable().optional(),
  exclusivity_info: z.record(z.string(), z.unknown()).nullable().optional(),
  embargo: z.record(z.string(), z.unknown()).nullable().optional(),
});

const paymentItemSchema = z.object({
  label: z.string(),
  amount: z.number().min(0),
  invoice_date: z.string(),
  payment_term: z.union([z.literal(14), z.literal(30), z.literal(45)]),
  paid_at: z.string().optional(),
});

const patchSchema = z.object({
  brand_id: z.string().nullable().optional(),
  brand_name: z.string().nullable().optional(),
  contact_person: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  product: z.string().nullable().optional(),
  campaign_start: z.string().nullable().optional(),
  campaign_end: z.string().nullable().optional(),
  deliverables: z.array(deliverableSchema).optional(),
  payment_items: z.array(paymentItemSchema).optional(),
  fee: z.number().nullable().optional(),
  format: z.string().nullable().optional(),
  budget_requested: z.number().nullable().optional(),
  budget_offer: z.number().nullable().optional(),
  guidelines: z.record(z.string(), z.unknown()).nullable().optional(),
  tracking_assets: z.record(z.string(), z.unknown()).nullable().optional(),
  source: z.enum(["email", "ig_dm", "whatsapp", "manual"]).optional(),
  status: z.enum(["neu", "pruefung", "angebot", "verhandlung", "zugesagt", "gewonnen", "abgelehnt"]).optional(),
  rejection_reason: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Ungültige Daten" }, { status: 400 });
    }
    const anfrage = await AnfrageService.updateAnfrage(id, parsed.data);
    return Response.json({ anfrage });
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
    await AnfrageService.deleteAnfrage(id);
    return new Response(null, { status: 204 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
