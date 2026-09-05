import { z } from "zod";
import { getAuthContext } from "@/domains/auth";
import { createClient } from "@/lib/supabase/server";
import { toErrorResponse } from "@/lib/auth-context";

type AiDeliverable = {
  count: number;
  content_type: string;
  platform: string;
  draft_deadline: string | null;
  freigabe_deadline: string | null;
  live_date: string | null;
};

type AiPaymentItem = {
  label: string;
  amount: number;
  invoice_date: string | null;
  payment_term: 14 | 30 | 45;
};

type AiGuidelines = {
  labeling: string | null;
  wording: string | null;
  nogo: string | null;
  hashtags: string[];
} | null;

type AiTrackingAssets = {
  discount_code: string | null;
  affiliate_links: string[];
  utm_params: string | null;
} | null;

type AiResult = {
  creator_id: string | null;
  creator_confidence: number;
  contact: string | null;
  title: string | null;
  product: string | null;
  budget: number | null;
  budget_offer: number | null;
  fee: number | null;
  period: string | null;
  campaign_start: string | null;
  campaign_end: string | null;
  notes: string | null;
  deliverables: AiDeliverable[];
  payment_items: AiPaymentItem[];
  guidelines: AiGuidelines;
  tracking_assets: AiTrackingAssets;
  missing_information: string[];
  suggested_reply: string | null;
};

export type AnalyseResult = AiResult & {
  brand_name: string | null;
  brand_id: string | null;
  brand_is_new: boolean;
  anfrage_id: string | null;
};

const bodySchema = z.object({ mode: z.enum(["create", "merge"]).optional() });

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function matchBrand(
  senderEmail: string,
  senderName: string | null,
  brands: { id: string; company_name: string }[],
  contacts: { brand_id: string; email: string | null }[],
): { id: string; company_name: string } | null {
  // 1. Exact contact email match
  const contactMatch = contacts.find(
    (c) => c.email && c.email.toLowerCase() === senderEmail.toLowerCase(),
  );
  if (contactMatch) {
    return brands.find((b) => b.id === contactMatch.brand_id) ?? null;
  }

  // 2. Email domain vs company name
  const domain = senderEmail.split("@")[1]?.split(".")[0] ?? "";
  if (domain) {
    const domainNorm = normalize(domain);
    const byDomain = brands.find((b) => {
      const n = normalize(b.company_name);
      return n.includes(domainNorm) || domainNorm.includes(n);
    });
    if (byDomain) return byDomain;
  }

  // 3. Sender name vs company name
  if (senderName) {
    const nameNorm = normalize(senderName);
    const byName = brands.find((b) => {
      const n = normalize(b.company_name);
      return n.includes(nameNorm) || nameNorm.includes(n);
    });
    if (byName) return byName;
  }

  return null;
}

/** Compact snapshot passed to the AI for orientation on a follow-up merge. */
function anfrageSnapshot(a: Record<string, unknown>): Record<string, unknown> {
  return {
    brand_name: a.brand_name,
    title: a.title,
    product: a.product,
    contact_person: a.contact_person,
    campaign_start: a.campaign_start,
    campaign_end: a.campaign_end,
    budget_requested: a.budget_requested,
    budget_offer: a.budget_offer,
    fee: a.fee,
    deliverables_count: Array.isArray(a.deliverables) ? a.deliverables.length : 0,
    payment_items_count: Array.isArray(a.payment_items) ? a.payment_items.length : 0,
    has_guidelines: a.guidelines != null,
    has_tracking_assets: a.tracking_assets != null,
  };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);

    const parsedBody = bodySchema.safeParse(await req.json().catch(() => ({})));
    const mode = parsedBody.success ? parsedBody.data.mode ?? "create" : "create";

    // Load thread for sender info + auth check
    const { data: thread, error: threadErr } = await supabase
      .from("email_threads")
      .select("id, agency_id, sender_email, sender_name, conversation_id")
      .eq("id", id)
      .eq("agency_id", agencyId)
      .single();

    if (threadErr || !thread) {
      return Response.json({ error: "Thread not found" }, { status: 404 });
    }

    // Follow-up merge: load the linked Anfrage as orientation for the model.
    let currentAnfrage: Record<string, unknown> | null = null;
    let anfrageId: string | null = null;
    if (mode === "merge" && thread.conversation_id) {
      const { data: conv } = await supabase
        .from("conversations")
        .select("anfrage_id")
        .eq("id", thread.conversation_id)
        .maybeSingle();
      anfrageId = conv?.anfrage_id ?? null;
      if (anfrageId) {
        const { data: anfrage } = await supabase
          .from("anfragen")
          .select(
            "brand_name, title, product, contact_person, campaign_start, campaign_end, budget_requested, budget_offer, fee, deliverables, payment_items, guidelines, tracking_assets",
          )
          .eq("id", anfrageId)
          .eq("agency_id", agencyId)
          .maybeSingle();
        if (anfrage) currentAnfrage = anfrageSnapshot(anfrage);
      }
    }

    // Deterministic brand matching (parallel with AI call)
    const [brandsRes, contactsRes, aiRes] = await Promise.all([
      supabase
        .from("brands")
        .select("id, company_name")
        .eq("agency_id", agencyId),
      supabase
        .from("brand_contacts")
        .select("brand_id, email")
        .eq("agency_id", agencyId),
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/execute-ai-job`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          email_thread_id: id,
          agency_id: agencyId,
          mode: "analyse",
          current_anfrage: currentAnfrage,
        }),
      }),
    ]);

    if (!aiRes.ok) {
      const text = await aiRes.text().catch(() => "(no body)");
      return Response.json({ error: `AI analyse failed (${aiRes.status}): ${text}` }, { status: 500 });
    }

    const aiData = await aiRes.json() as AiResult;
    const brands = brandsRes.data ?? [];
    const contacts = contactsRes.data ?? [];

    const matchedBrand = matchBrand(
      thread.sender_email,
      thread.sender_name,
      brands,
      contacts,
    );

    const result: AnalyseResult = {
      ...aiData,
      brand_id:    matchedBrand?.id ?? null,
      brand_name:  matchedBrand?.company_name ?? null,
      brand_is_new: matchedBrand === null,
      anfrage_id:  anfrageId,
    };

    return Response.json(result);
  } catch (e) {
    return toErrorResponse(e);
  }
}
