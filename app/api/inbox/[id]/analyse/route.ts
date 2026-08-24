import { getAuthContext } from "@/domains/auth";
import { createClient } from "@/lib/supabase/server";
import { toErrorResponse } from "@/lib/auth-context";

type AiResult = {
  creator_id: string | null;
  creator_confidence: number;
  contact: string | null;
  format: string | null;
  product: string | null;
  budget: number | null;
  period: string | null;
};

export type AnalyseResult = AiResult & {
  brand_name: string | null;
  brand_id: string | null;
  brand_is_new: boolean;
};

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

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);

    // Load thread for sender info + auth check
    const { data: thread, error: threadErr } = await supabase
      .from("email_threads")
      .select("id, agency_id, sender_email, sender_name")
      .eq("id", id)
      .eq("agency_id", agencyId)
      .single();

    if (threadErr || !thread) {
      return Response.json({ error: "Thread not found" }, { status: 404 });
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
        body: JSON.stringify({ email_thread_id: id, agency_id: agencyId, mode: "analyse" }),
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
    };

    return Response.json(result);
  } catch (e) {
    return toErrorResponse(e);
  }
}
