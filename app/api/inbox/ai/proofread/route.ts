import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/domains/auth";
import { createClient } from "@/lib/supabase/server";
import { toErrorResponse } from "@/lib/auth-context";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  text: z.string().min(1).max(20_000),
});

// Streams a spell/grammar-corrected version of the draft back as plain text.
// Auth gate here → Supabase Edge Function (service role) → OpenAI (streamed).
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: "Ungültige Daten" }, { status: 400 });
    }

    const upstream = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/execute-ai-job`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          mode: "proofread",
          text: parsed.data.text,
          agency_id: agencyId,
        }),
      },
    );

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => "");
      return Response.json(
        { error: `Korrektur fehlgeschlagen (${upstream.status}): ${detail}` },
        { status: 502 },
      );
    }

    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    return toErrorResponse(e);
  }
}
