import { NextRequest } from "next/server";
import { z } from "zod";
import { toErrorResponse } from "@/lib/auth-context";
import { DealService } from "@/domains/deals";

const patchSchema = z.object({
  status: z.string().optional(),
  title: z.string().optional(),
  brand_id: z.string().nullable().optional(),
  product: z.string().nullable().optional(),
  platform: z.string().nullable().optional(),
  creator_id: z.string().nullable().optional(),
  contact_person: z.string().nullable().optional(),
  deliverables: z.array(z.any()).optional(),
  deadline: z.string().nullable().optional(),
  usage_rights: z.string().nullable().optional(),
  exclusivity: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  budget: z.number().optional(),
  payment_items: z.array(z.any()).optional(),
  campaign_start: z.string().nullable().optional(),
  campaign_end: z.string().nullable().optional(),
  assignee_id: z.string().nullable().optional(),
  contract_status: z.enum(["offen", "versendet", "unterschrieben"]).nullable().optional(),
  contract_date: z.string().nullable().optional(),
  contract_url: z.string().nullable().optional(),
  rights: z.record(z.string(), z.any()).nullable().optional(),
  approval_info: z.record(z.string(), z.any()).nullable().optional(),
  delivery_info: z.record(z.string(), z.any()).nullable().optional(),
  guidelines: z.record(z.string(), z.any()).nullable().optional(),
  tracking_assets: z.record(z.string(), z.any()).nullable().optional(),
  exclusivity_info: z.record(z.string(), z.any()).nullable().optional(),
  embargo: z.record(z.string(), z.any()).nullable().optional(),
  whitelisting: z.record(z.string(), z.any()).nullable().optional(),
});

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await DealService.deleteDeal(id);
    return new Response(null, { status: 204 });
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
    if (!parsed.success) {
      return Response.json({ error: "Ungültige Daten" }, { status: 400 });
    }
    const deal = await DealService.updateDeal(id, parsed.data);
    return Response.json({ deal });
  } catch (e) {
    return toErrorResponse(e);
  }
}
