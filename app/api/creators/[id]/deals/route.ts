import { NextRequest } from "next/server";
import { getAuthContext, toErrorResponse } from "@/lib/auth-context";
import { dealFormSchema } from "@/app/(main)/creators/deals/create-deal/[id]/deal-form.schema";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: creatorId } = await params;
    const { supabase } = await getAuthContext();

    const { data: deals, error } = await supabase
      .from("deals")
      .select(`
        id, title, budget, status, priority, platform, deadline,
        campaign_type, deliverables, description, created_at,
        brands(company_name, color, short_code, contact_name, contact_email)
      `)
      .eq("creator_id", creatorId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return Response.json({ deals: deals ?? [] });
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
    const { supabase, agencyId } = await getAuthContext();

    const body = await req.json();
    const parsed = dealFormSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Ungültige Formulardaten" }, { status: 400 });
    }

    const {
      title, brand_id, product, platform, creator_id,
      contact_person, deliverables, deadline, usage_rights, exclusivity, notes,
      fee, payment_items,
    } = parsed.data;

    const { data: deal, error } = await supabase
      .from("deals")
      .insert({
        agency_id: agencyId,
        creator_id: creator_id || creatorId,
        brand_id: brand_id || null,
        title,
        product: product || null,
        platform: platform || null,
        contact_person: contact_person || null,
        deliverables,
        deadline: deadline || null,
        usage_rights: usage_rights || null,
        exclusivity: exclusivity || null,
        description: notes || null,
        budget: fee,
        payment_items,
        source: "manual",
      })
      .select("id")
      .single();

    if (error) throw error;

    return Response.json({ deal }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
