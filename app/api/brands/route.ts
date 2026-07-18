import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthContext, toErrorResponse } from "@/lib/auth-context";

const LAUFEND = new Set(["confirmed", "production", "approval", "scheduled", "posted"]);
const ALT = new Set(["invoiced", "paid"]);

const createSchema = z.object({
  company_name: z.string().min(1),
  short_code: z.string().min(1).max(4),
  color: z.string().min(1),
  industry: z.string().nullable().optional(),
});

export async function GET(_req: NextRequest) {
  try {
    const { supabase, agencyId } = await getAuthContext();

    const [
      { data: brands, error: brandsErr },
      { data: deals, error: dealsErr },
      { data: anfragen, error: anfrageErr },
    ] = await Promise.all([
      supabase
        .from("brands")
        .select("id, company_name, short_code, color, industry")
        .eq("agency_id", agencyId)
        .order("company_name"),
      supabase
        .from("deals")
        .select("id, brand_id, budget, status, payment_items, created_at")
        .eq("agency_id", agencyId),
      supabase
        .from("anfragen")
        .select("id, brand_id")
        .eq("agency_id", agencyId)
        .not("brand_id", "is", null),
    ]);

    if (brandsErr) throw brandsErr;
    if (dealsErr) throw dealsErr;
    if (anfrageErr) throw anfrageErr;

    const now = Date.now();

    const result = (brands ?? []).map((brand) => {
      const brandDeals = (deals ?? []).filter((d) => d.brand_id === brand.id);
      const brandAnfragen = (anfragen ?? []).filter((a) => a.brand_id === brand.id);

      const activeDealCount = brandDeals.filter((d) => LAUFEND.has(d.status)).length;
      const totalRevenue = brandDeals
        .filter((d) => LAUFEND.has(d.status) || ALT.has(d.status))
        .reduce((s, d) => s + Number(d.budget), 0);

      const lastActivity =
        brandDeals.length > 0
          ? brandDeals.reduce(
              (max, d) => (d.created_at > max ? d.created_at : max),
              brandDeals[0].created_at,
            )
          : null;

      const hasOverduePayment = brandDeals.some((d) => {
        if (!d.payment_items) return false;
        return (d.payment_items as any[]).some((item) => {
          if (!item.invoice_date || item.paid_at) return false;
          const due =
            new Date(item.invoice_date).getTime() +
            (item.payment_term ?? 30) * 86_400_000;
          return due < now;
        });
      });

      return {
        ...brand,
        deal_count: brandDeals.length,
        active_deal_count: activeDealCount,
        total_revenue: totalRevenue,
        last_activity: lastActivity,
        has_overdue_payment: hasOverduePayment,
        only_contact: brandDeals.length === 0 && brandAnfragen.length > 0,
      };
    });

    return Response.json({ brands: result });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, agencyId } = await getAuthContext();
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success)
      return Response.json({ error: "Ungültige Daten" }, { status: 400 });

    const { data: brand, error } = await supabase
      .from("brands")
      .insert({ agency_id: agencyId, ...parsed.data })
      .select("id, company_name, short_code, color, industry")
      .single();

    if (error) throw error;
    return Response.json({ brand }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
