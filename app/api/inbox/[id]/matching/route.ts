import { z } from "zod";
import { getAuthContext } from "@/domains/auth";
import type { MatchingResponse } from "@/domains/matching";
import { toErrorResponse } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/server";
import { matchBrandFromSender } from "@/domains/communication/brand-matching";

const bodySchema = z.object({ creatorId: z.string().uuid() });

function isMatchingResponse(value: unknown): value is MatchingResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<MatchingResponse>;
  return Boolean(
    candidate.extraction &&
      candidate.matching &&
      typeof candidate.matching.summary === "string" &&
      typeof candidate.matching.score === "number" &&
      candidate.matching.dimensions,
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: threadId } = await params;
    const body = bodySchema.parse(await req.json());
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);

    const [threadRes, brandsRes, contactsRes, creatorRes] = await Promise.all([
      supabase
        .from("email_threads")
        .select("id, sender_email, sender_name")
        .eq("id", threadId)
        .eq("agency_id", agencyId)
        .maybeSingle(),
      supabase.from("brands").select("id, company_name").eq("agency_id", agencyId),
      supabase.from("brand_contacts").select("brand_id, email").eq("agency_id", agencyId),
      supabase
        .from("creators")
        .select("id")
        .eq("id", body.creatorId)
        .eq("agency_id", agencyId)
        .maybeSingle(),
    ]);

    if (!threadRes.data) return Response.json({ error: "Thread not found" }, { status: 404 });
    if (!creatorRes.data) return Response.json({ error: "Creator not found" }, { status: 404 });

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/execute-ai-job`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          email_thread_id: threadId,
          agency_id: agencyId,
          creator_id: body.creatorId,
          mode: "matching",
        }),
      },
    );

    if (!response.ok) {
      const message = await response.text().catch(() => "Unbekannter Fehler");
      return Response.json({ error: `Matching fehlgeschlagen: ${message}` }, { status: 502 });
    }

    const result: unknown = await response.json();
    if (!isMatchingResponse(result)) {
      const detail = result && typeof result === "object" && "error" in result
        ? String(result.error)
        : "Die Edge Function liefert noch kein Matching-Ergebnis.";
      return Response.json(
        { error: `Ungültige Matching-Antwort: ${detail} Bitte execute-ai-job neu deployen.` },
        { status: 502 },
      );
    }
    const matchedBrand = matchBrandFromSender(
      threadRes.data.sender_email,
      threadRes.data.sender_name,
      brandsRes.data ?? [],
      contactsRes.data ?? [],
    );

    return Response.json({
      ...result,
      extraction: {
        ...result.extraction,
        brand_name: matchedBrand?.company_name ?? null,
        brand_id: matchedBrand?.id ?? null,
        brand_is_new: !matchedBrand,
        anfrage_id: null,
      },
    } satisfies MatchingResponse);
  } catch (error) {
    return toErrorResponse(error);
  }
}
