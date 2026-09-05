// execute-ai-job — Supabase Edge Function
// Flow: Load thread → Resolve conversation → Deterministic check → AI label → Write result
import { createClient } from "npm:@supabase/supabase-js@2";
import { PROMPT_REGISTRY, getAdapter } from "./registry.ts";
import { buildEmailAnalysisContext } from "./tasks/incoming-email-analysis/context.ts";
import { maybeEmitInboundNotification } from "./notify.ts";

type Payload = {
  email_thread_id: string;
  agency_id: string;
  mode?: "label" | "analyse" | "proofread";
  text?: string;
  current_anfrage?: Record<string, unknown> | null;
};

type ThreadRow = {
  id: string;
  subject: string;
  gmail_thread_id: string | null;
  message_id: string | null;
  in_reply_to: string | null;
  references_header: string | null;
  system_labels: string[];
  integration_id: string;
  folder: string | null;
  sender_email: string | null;
  sender_name: string | null;
};

Deno.serve(async (req) => {
  try {
    const payload = (await req.json()) as Payload;
    const { email_thread_id, agency_id, mode = "label" } = payload;

    // ── Proofread mode: correct a draft, stream plain text back, no DB ───────
    if (mode === "proofread") {
      const text = typeof payload.text === "string" ? payload.text : "";
      if (!text.trim()) return json({ error: "text required" }, 400);

      const proofreadDef = PROMPT_REGISTRY.EMAIL_DRAFT_PROOFREAD;
      const adapter = getAdapter(proofreadDef.provider);
      const stream = await adapter.executeStream({
        system: proofreadDef.system,
        messages: proofreadDef.buildMessages({ text }),
        model: proofreadDef.model,
        maxTokens: proofreadDef.maxTokens,
        reasoning: proofreadDef.reasoning,
      });

      return new Response(stream.pipeThrough(new TextEncoderStream()), {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    if (!email_thread_id || !agency_id) {
      return json({ error: "email_thread_id and agency_id required" }, 400);
    }

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Analyse mode: extract WorkPanel fields from email, no DB writes ──────
    if (mode === "analyse") {
      const analyseDef = PROMPT_REGISTRY.INCOMING_EMAIL_ANALYSIS;
      const ctx = await buildEmailAnalysisContext(
        { email_thread_id, current_anfrage: payload.current_anfrage ?? null },
        agency_id,
        db,
      );
      const adapter = getAdapter(analyseDef.provider);
      const response = await adapter.execute({
        system: analyseDef.system,
        messages: analyseDef.buildMessages(ctx),
        model: analyseDef.model,
        maxTokens: analyseDef.maxTokens,
      });
      const parsed = analyseDef.outputSchema.parse(JSON.parse(response.content));

      return json({
        creator_id:         parsed.creator_id,
        creator_confidence: parsed.creator_confidence,
        contact:            parsed.contact,
        title:              parsed.title,
        product:            parsed.product,
        budget:             parsed.budget,
        budget_offer:       parsed.budget_offer,
        fee:                parsed.fee,
        period:             parsed.period,
        campaign_start:     parsed.campaign_start,
        campaign_end:       parsed.campaign_end,
        notes:              parsed.notes,
        deliverables:       parsed.deliverables,
        payment_items:      parsed.payment_items,
        guidelines:         parsed.guidelines,
        tracking_assets:    parsed.tracking_assets,
        missing_information: parsed.missing_information,
        suggested_reply:    parsed.suggested_reply,
      });
    }

    // 1. Load thread
    const { data: thread, error: threadErr } = await db
      .from("email_threads")
      .select(
        "id, subject, gmail_thread_id, message_id, in_reply_to, references_header, system_labels, integration_id, folder, sender_email, sender_name",
      )
      .eq("id", email_thread_id)
      .single<ThreadRow>();

    if (threadErr) return json({ error: `Thread not found: ${threadErr.message}` }, 400);
    if (thread.system_labels.length > 0) return json({ skipped: true, reason: "already_labeled" });

    // 2. Resolve or create conversation
    const conversationId = await resolveConversation(db, thread, agency_id);

    // 3. Deterministic: conversation linked to an anfrage → always LAUFEND
    const { data: conv } = await db
      .from("conversations")
      .select("anfrage_id")
      .eq("id", conversationId)
      .maybeSingle<{ anfrage_id: string | null }>();

    // Deterministic LAUFEND when conversation has a linked anfrage
    const deterministicLabels: string[] = conv?.anfrage_id ? ["LAUFEND"] : [];

    // 3b. Movement-Notification — Antwort auf verknüpfte Anfrage, sonst Mail
    // von bekannter Brand. Läuft unabhängig von AUTO_LABEL, best-effort.
    await maybeEmitInboundNotification(db, {
      thread,
      agencyId: agency_id,
      conversationId,
      anfrageId: conv?.anfrage_id ?? null,
    });

    // 4. Check integration's AUTO_LABEL flag
    const { data: integration } = await db
      .from("email_integrations")
      .select("auto_label")
      .eq("id", thread.integration_id)
      .maybeSingle<{ auto_label: boolean }>();

    if (!integration?.auto_label) {
      const baseLabels = deterministicLabels;
      await db
        .from("email_threads")
        .update({
          system_labels: baseLabels,
          label_status: baseLabels.length > 0 ? "completed" : "skipped",
          conversation_id: conversationId,
        })
        .eq("id", email_thread_id);
      return json({ skipped: true, reason: "auto_label_disabled", labels: baseLabels });
    }

    // 5. Mark as processing
    await db
      .from("email_threads")
      .update({ label_status: "processing", conversation_id: conversationId })
      .eq("id", email_thread_id);

    // 6. Run AI — wrap in try/catch so failures always write "failed" to DB
    let finalLabels: string[];
    try {
      const labelDef = PROMPT_REGISTRY.EMAIL_LABEL;
      const ctx = await buildEmailAnalysisContext({ email_thread_id }, agency_id, db);
      const labelAdapter = getAdapter(labelDef.provider);

      const labelResponse = await labelAdapter.execute({
        system: labelDef.system,
        messages: labelDef.buildMessages({ subject: ctx.email.subject, body: ctx.email.body }),
        model: labelDef.model,
        maxTokens: labelDef.maxTokens,
      });

      const labelParsed = labelDef.outputSchema.parse(JSON.parse(labelResponse.content));
      const remaining = 3 - deterministicLabels.length;
      finalLabels = [...deterministicLabels, ...labelParsed.labels.slice(0, remaining)];
    } catch (aiErr) {
      const msg = aiErr instanceof Error ? aiErr.message : String(aiErr);
      console.error("AI call failed:", msg);
      await db
        .from("email_threads")
        .update({ label_status: "failed" })
        .eq("id", email_thread_id);
      return json({ error: msg }, 500);
    }

    // 7. Write labels
    await db
      .from("email_threads")
      .update({
        system_labels: finalLabels,
        label_status: "completed",
        conversation_id: conversationId,
      })
      .eq("id", email_thread_id);

    return json({ ok: true, labels: finalLabels });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("execute-ai-job:", msg);
    return json({ error: msg }, 500);
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function resolveConversation(
  db: ReturnType<typeof createClient>,
  thread: ThreadRow,
  agency_id: string,
): Promise<string> {
  // Try 1: Gmail native thread grouping
  if (thread.gmail_thread_id) {
    const { data } = await db
      .from("conversations")
      .select("id")
      .eq("agency_id", agency_id)
      .eq("provider_thread_id", thread.gmail_thread_id)
      .maybeSingle<{ id: string }>();
    if (data) return data.id;
  }

  // Try 2: RFC 5322 threading (In-Reply-To / References)
  const refs = [
    ...(thread.in_reply_to ? [thread.in_reply_to.trim()] : []),
    ...(thread.references_header ? thread.references_header.trim().split(/\s+/) : []),
  ].filter(Boolean);

  if (refs.length > 0) {
    const { data: sibling } = await db
      .from("email_threads")
      .select("conversation_id")
      .eq("agency_id", agency_id)
      .in("message_id", refs)
      .not("conversation_id", "is", null)
      .order("received_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ conversation_id: string }>();

    if (sibling?.conversation_id) return sibling.conversation_id;
  }

  // Try 3: Subject canonical match (same integration, within 30 days)
  const canonical = thread.subject.replace(/^(Re|Fwd|Fw|Aw|Antwort):\s*/gi, "").trim();
  if (canonical) {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: bySubject } = await db
      .from("conversations")
      .select("id")
      .eq("agency_id", agency_id)
      .eq("integration_id", thread.integration_id)
      .eq("subject_canonical", canonical)
      .gte("last_email_at", cutoff)
      .order("last_email_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string }>();

    if (bySubject) return bySubject.id;
  }

  // Create new conversation
  const { data: newConv, error } = await db
    .from("conversations")
    .insert({
      agency_id,
      integration_id: thread.integration_id,
      provider_thread_id: thread.gmail_thread_id,
      subject_canonical: canonical || thread.subject,
      first_email_at: new Date().toISOString(),
      last_email_at: new Date().toISOString(),
    })
    .select("id")
    .single<{ id: string }>();

  if (error) throw new Error(`Create conversation: ${error.message}`);
  return newConv.id;
}
