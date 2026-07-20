import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthContext, toErrorResponse } from "@/lib/auth-context";

const LAUFEND = new Set(["confirmed", "production", "approval", "scheduled", "posted"]);
const ALT = new Set(["invoiced", "paid"]);

const patchSchema = z.object({
  company_name: z.string().min(1).optional(),
  short_code: z.string().min(1).max(4).optional(),
  color: z.string().optional(),
  industry: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { supabase, agencyId } = await getAuthContext();

    const [
      { data: brand, error: brandErr },
      { data: contacts, error: contactsErr },
      { data: deals, error: dealsErr },
      { data: anfragen, error: anfrageErr },
      { data: allCreators, error: creatorsErr },
    ] = await Promise.all([
      supabase.from("brands").select("*").eq("id", id).eq("agency_id", agencyId).single(),
      supabase.from("brand_contacts").select("*").eq("brand_id", id).order("created_at"),
      supabase
        .from("deals")
        .select(
          "id, title, budget, status, deadline, campaign_type, usage_rights, exclusivity, payment_items, created_at, creator_id, creators(id, full_name, initials, color)",
        )
        .eq("brand_id", id)
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false }),
      supabase
        .from("anfragen")
        .select(
          "id, format, budget_requested, status, rejection_reason, notes, created_at, creator_id, creators(id, full_name, initials, color)",
        )
        .eq("brand_id", id)
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false }),
      supabase
        .from("creators")
        .select("id, full_name, initials, color")
        .eq("agency_id", agencyId)
        .order("full_name"),
    ]);

    if (brandErr) throw brandErr;
    if (contactsErr) throw contactsErr;
    if (dealsErr) throw dealsErr;
    if (anfrageErr) throw anfrageErr;
    if (creatorsErr) throw creatorsErr;

    // Group deals + anfragen by creator
    const creatorMap = new Map<string, { creator: any; deals: any[]; anfragen: any[] }>();

    for (const deal of deals ?? []) {
      const creator = (deal as any).creators;
      if (!creator?.id) continue;
      if (!creatorMap.has(creator.id)) {
        creatorMap.set(creator.id, { creator, deals: [], anfragen: [] });
      }
      creatorMap.get(creator.id)!.deals.push(deal);
    }

    for (const anfrage of anfragen ?? []) {
      const creator = (anfrage as any).creators;
      if (!creator?.id) continue;
      if (!creatorMap.has(creator.id)) {
        creatorMap.set(creator.id, { creator, deals: [], anfragen: [] });
      }
      creatorMap.get(creator.id)!.anfragen.push(anfrage);
    }

    const creatorSummaries = Array.from(creatorMap.values()).map(
      ({ creator, deals, anfragen }) => {
        const hasActiveDeal = deals.some((d: any) => LAUFEND.has(d.status));
        const totalRevenue = deals
          .filter((d: any) => LAUFEND.has(d.status) || ALT.has(d.status))
          .reduce((s: number, d: any) => s + Number(d.budget), 0);
        return {
          creator,
          deals,
          anfragen,
          has_active_deal: hasActiveDeal,
          total_revenue: totalRevenue,
          only_contact: deals.length === 0,
        };
      },
    );

    // Creators who have no deals/anfragen with this brand
    const involvedCreatorIds = new Set(creatorMap.keys());
    const gapCreators = (allCreators ?? []).filter((c) => !involvedCreatorIds.has(c.id));

    return Response.json({
      brand,
      contacts: contacts ?? [],
      creator_summaries: creatorSummaries,
      all_deals: deals ?? [],
      gap_creators: gapCreators,
    });
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
    const { supabase, agencyId } = await getAuthContext();
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success)
      return Response.json({ error: "Ungültige Daten" }, { status: 400 });

    const { data: brand, error } = await supabase
      .from("brands")
      .update(parsed.data)
      .eq("id", id)
      .eq("agency_id", agencyId)
      .select("*")
      .single();

    if (error) throw error;
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
    const { supabase, agencyId } = await getAuthContext();

    const { error } = await supabase
      .from("brands")
      .delete()
      .eq("id", id)
      .eq("agency_id", agencyId);

    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
