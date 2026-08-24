import { NextRequest } from "next/server";
import { toErrorResponse } from "@/lib/auth-context";
import { DealService } from "@/domains/deals";
import { dealFormSchema } from "@/app/(main)/creators/deals/create-deal/[id]/deal-form.schema";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: creatorId } = await params;
    const deals = await DealService.getDealsByCreator(creatorId);
    return Response.json({ deals });
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
    const parsed = dealFormSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Ungültige Formulardaten" }, { status: 400 });
    }

    const {
      title, brand_id, product, creator_id,
      contact_person, campaign_start, campaign_end, deliverables,
      assignee_id, notes, fee, payment_items,
      guidelines, tracking_assets,
      rights, exclusivity_info, embargo, whitelisting,
      contract_status, contract_date, contract_url,
    } = parsed.data;

    const deal = await DealService.createDeal(creator_id || creatorId, {
      brand_id: brand_id || null,
      title,
      product: product || null,
      contact_person: contact_person || null,
      campaign_start: campaign_start || null,
      campaign_end: campaign_end || null,
      assignee_id: assignee_id || null,
      deliverables,
      description: notes || null,
      guidelines: guidelines ?? null,
      tracking_assets: tracking_assets ?? null,
      rights: rights ?? null,
      exclusivity_info: exclusivity_info ?? null,
      embargo: embargo ?? null,
      whitelisting: whitelisting ?? null,
      contract_status: (contract_status ?? "offen") as "offen" | "versendet" | "unterschrieben",
      contract_date: contract_date || null,
      contract_url: contract_url || null,
      budget: fee,
      payment_items,
      status: "confirmed",
      source: "manual",
    });

    return Response.json({ deal }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
