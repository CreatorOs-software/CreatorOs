// execute-ai-job — Supabase Edge Function
// Flow: Load thread → Resolve conversation → Deterministic check → AI label → Write result
import { createClient } from "npm:@supabase/supabase-js@2";
import { PROMPT_REGISTRY, getAdapter } from "./registry.ts";
import { buildEmailAnalysisContext } from "./tasks/incoming-email-analysis/context.ts";
import { buildAttachmentAnalyzeContext } from "./tasks/attachment-analyze/context.ts";
import { maybeEmitInboundNotification } from "./notify.ts";
import { buildCreatorRequestMatchingContext } from "./tasks/creator-request-matching/context.ts";
import { buildEmailLabelContext } from "./tasks/email-label/context.ts";

type Payload = {
  email_thread_id: string;
  agency_id: string;
  mode?: "label" | "analyse" | "matching" | "proofread" | "analyze-attachment";
  text?: string;
  current_anfrage?: Record<string, unknown> | null;
  email_attachment_id?: string;
  creator_id?: string;
  force_relabel?: boolean;
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

    // ── Attachment mode: classify + (conditionally) extract a file attachment
    // in one call, no DB writes. Only ever runs on an explicit user click on
    // a chosen attachment card — the caller enforces that, not this function.
    if (mode === "analyze-attachment") {
      if (!agency_id || !payload.email_attachment_id) {
        return json({ error: "agency_id and email_attachment_id required" }, 400);
      }

      const db = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      const def = PROMPT_REGISTRY.ATTACHMENT_ANALYZE;
      const ctx = await buildAttachmentAnalyzeContext({ email_attachment_id: payload.email_attachment_id }, agency_id, db);
      const adapter = getAdapter(def.provider);
      const response = await adapter.execute({
        system: def.system,
        messages: def.buildMessages(ctx),
        model: def.model,
        maxTokens: def.maxTokens,
      });
      return json(def.outputSchema.parse(JSON.parse(response.content)));
    }

    if (!email_thread_id || !agency_id) {
      return json({ error: "email_thread_id and agency_id required" }, 400);
    }

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (mode === "matching") {
      if (!payload.creator_id) return json({ error: "creator_id required" }, 400);

      const analyseDef = PROMPT_REGISTRY.INCOMING_EMAIL_ANALYSIS;
      const emailContext = await buildEmailAnalysisContext(
        { email_thread_id, current_anfrage: null },
        agency_id,
        db,
      );
      const analyseResponse = await getAdapter(analyseDef.provider).execute({
        system: analyseDef.system,
        messages: analyseDef.buildMessages(emailContext),
        model: analyseDef.model,
        maxTokens: analyseDef.maxTokens,
      });
      const extraction = analyseDef.outputSchema.parse(JSON.parse(analyseResponse.content));

      const matchingContext = await buildCreatorRequestMatchingContext(
        {
          creator_id: payload.creator_id,
          request: extraction,
          email: {
            subject: emailContext.email.subject,
            sender_email: emailContext.email.sender_email,
            sender_name: emailContext.email.sender_name,
          },
        },
        agency_id,
        db,
      );
      const matchingDef = PROMPT_REGISTRY.CREATOR_REQUEST_MATCHING;
      const matchingResponse = await getAdapter(matchingDef.provider).execute({
        system: matchingDef.system,
        messages: matchingDef.buildMessages(matchingContext),
        model: matchingDef.model,
        maxTokens: matchingDef.maxTokens,
      });
      const aiMatching = matchingDef.outputSchema.parse(JSON.parse(matchingResponse.content));
      const weights = {
        goal_fit: 30,
        budget_fit: 25,
        content_fit: 20,
        timing_fit: 15,
        brand_fit: 10,
      } as const;
      const scoredDimensions = Object.entries(weights).flatMap(([key, weight]) => {
        const score = aiMatching.dimensions[key as keyof typeof weights].score;
        return score == null ? [] : [{ score, weight }];
      });
      const totalWeight = scoredDimensions.reduce((sum, item) => sum + item.weight, 0);
      const weightedScore = totalWeight === 0
        ? 0
        : Math.round(
          scoredDimensions.reduce((sum, item) => sum + item.score * item.weight, 0) /
            totalWeight,
        );
      const hasFailedRule = matchingContext.deterministic_rules.some((rule) => rule.status === "fail");
      const score = hasFailedRule ? Math.min(weightedScore, 69) : weightedScore;
      const verdict = score >= 75 && !hasFailedRule
        ? "strong"
        : score >= 45
          ? "conditional"
          : "weak";
      const matching = { ...aiMatching, score, verdict };

      return json({
        extraction,
        matching,
        goal_progress: matchingContext.goal_progress,
        deterministic_rules: matchingContext.deterministic_rules,
        prompt_version: matchingDef.version,
      });
    }

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

      const validCreatorIds = new Set(ctx.agency.creators.map((creator) => creator.id));
      const requestGroups = parsed.request_groups
        .map((group) => ({
          ...group,
          creator_ids: [...new Set(group.creator_ids.filter((creatorId) => validCreatorIds.has(creatorId)))],
        }))
        .filter((group) => group.creator_ids.length > 0);
      const rawAnalysedMatches = requestGroups.flatMap((group) =>
        group.creator_ids
          .map((creatorId) => ({
            thread_id: email_thread_id,
            creator_id: creatorId,
            agency_id,
            confidence: group.creator_confidence,
            relation: group.creator_ids.length > 1 ? "group" : "required",
            evidence: `Tiefenanalyse: ${group.title ?? group.key}`,
            request_group_key: group.key,
            source: "ai_analysis",
          }))
      ).sort((a, b) => b.confidence - a.confidence);
      const analysedMatches = rawAnalysedMatches.filter(
        (match, index, matches) =>
          matches.findIndex((candidate) => candidate.creator_id === match.creator_id) === index,
      );
      if (analysedMatches.length > 0) {
        const { error } = await db.from("email_thread_creator_matches").upsert(
          analysedMatches,
          { onConflict: "thread_id,creator_id" },
        );
        if (error) throw new Error(`analysis creator matches: ${error.message}`);
      }
      let staleMatchesQuery = db
        .from("email_thread_creator_matches")
        .delete()
        .eq("thread_id", email_thread_id)
        .eq("agency_id", agency_id);
      const analysedCreatorIds = analysedMatches.map((match) => match.creator_id);
      if (analysedCreatorIds.length > 0) {
        staleMatchesQuery = staleMatchesQuery.not(
          "creator_id",
          "in",
          `(${analysedCreatorIds.join(",")})`,
        );
      }
      const { error: staleMatchesError } = await staleMatchesQuery;
      if (staleMatchesError) throw new Error(`analysis creator cleanup: ${staleMatchesError.message}`);

      await db.from("email_threads").update({
        suggested_creator_id: analysedMatches[0]?.creator_id ?? null,
        confidence_score: analysedMatches[0]?.confidence ?? 0,
        request_structure: parsed.request_structure,
        request_structure_confidence: requestGroups.length > 0
          ? Math.max(...requestGroups.map((group) => group.creator_confidence))
          : 0,
      }).eq("id", email_thread_id).eq("agency_id", agency_id);

      return json({
        creator_id:         parsed.creator_id && validCreatorIds.has(parsed.creator_id) ? parsed.creator_id : null,
        creator_confidence: parsed.creator_id && validCreatorIds.has(parsed.creator_id) ? parsed.creator_confidence : 0,
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
        request_structure:  parsed.request_structure,
        request_groups:     requestGroups,
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
    if (thread.system_labels.length > 0 && !payload.force_relabel) {
      return json({ skipped: true, reason: "already_labeled" });
    }

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
    let classificationResult: {
      creator_matches: Array<{
        creator_id: string;
        confidence: number;
        relation: "required" | "alternative" | "group" | "mentioned" | "unknown";
        evidence: string;
        request_group_key: string | null;
      }>;
      request_structure: "single_request_single_creator" | "single_request_multiple_creators" | "multiple_distinct_requests" | "unclear";
      structure_confidence: number;
      suggested_creator_id: string | null;
      creator_candidates_considered: number;
    };
    try {
      const labelDef = PROMPT_REGISTRY.EMAIL_LABEL;
      const ctx = await buildEmailLabelContext(
        { email_thread_id, integration_id: thread.integration_id },
        agency_id,
        db,
      );
      const labelAdapter = getAdapter(labelDef.provider);

      const labelResponse = await labelAdapter.execute({
        system: labelDef.system,
        messages: labelDef.buildMessages(ctx),
        model: labelDef.model,
        maxTokens: labelDef.maxTokens,
        reasoning: labelDef.reasoning,
      });

      const labelParsed = labelDef.outputSchema.parse(JSON.parse(labelResponse.content));
      const remaining = 3 - deterministicLabels.length;
      finalLabels = [...deterministicLabels, ...labelParsed.labels.slice(0, remaining)];

      const validCreatorIds = new Set(ctx.creators.map((creator) => creator.id));
      const sortedCreatorMatches = labelParsed.creator_matches
        .filter((match) => validCreatorIds.has(match.creator_id) && match.confidence >= 60)
        .sort((a, b) => b.confidence - a.confidence);
      const creatorMatches = sortedCreatorMatches.filter(
        (match, index, matches) =>
          matches.findIndex((candidate) => candidate.creator_id === match.creator_id) === index,
      );
      if (
        creatorMatches.length === 0 &&
        ctx.mailbox_creator_id &&
        validCreatorIds.has(ctx.mailbox_creator_id)
      ) {
        creatorMatches.push({
          creator_id: ctx.mailbox_creator_id,
          confidence: 65,
          relation: "unknown",
          evidence: "Fallback über das dem Postfach zugeordnete Creator-Profil",
          request_group_key: null,
        });
      }

      if (creatorMatches.length > 0) {
        const { error: upsertError } = await db
          .from("email_thread_creator_matches")
          .upsert(
            creatorMatches.map((match) => ({
              thread_id: email_thread_id,
              creator_id: match.creator_id,
              agency_id,
              confidence: match.confidence,
              relation: match.relation,
              evidence: match.evidence,
              request_group_key: match.request_group_key,
              source: "ai_label",
            })),
            { onConflict: "thread_id,creator_id" },
          );
        if (upsertError) throw new Error(`creator match upsert: ${upsertError.message}`);
      }

      let staleQuery = db
        .from("email_thread_creator_matches")
        .delete()
        .eq("thread_id", email_thread_id)
        .eq("agency_id", agency_id)
        .eq("source", "ai_label");
      const matchedIds = creatorMatches.map((match) => match.creator_id);
      if (matchedIds.length > 0) {
        staleQuery = staleQuery.not("creator_id", "in", `(${matchedIds.join(",")})`);
      }
      const { error: staleError } = await staleQuery;
      if (staleError) throw new Error(`creator match cleanup: ${staleError.message}`);

      const primaryMatch = creatorMatches.toSorted((a, b) => b.confidence - a.confidence)[0];
      classificationResult = {
        creator_matches: creatorMatches,
        request_structure: labelParsed.request_structure,
        structure_confidence: labelParsed.structure_confidence,
        suggested_creator_id: primaryMatch?.creator_id ?? null,
        creator_candidates_considered: ctx.creators.length,
      };
      const { error: metadataError } = await db
        .from("email_threads")
        .update({
          suggested_creator_id: primaryMatch?.creator_id ?? null,
          confidence_score: primaryMatch?.confidence ?? 0,
          request_structure: labelParsed.request_structure,
          request_structure_confidence: labelParsed.structure_confidence,
          ai_processed: true,
        })
        .eq("id", email_thread_id)
        .eq("agency_id", agency_id);
      if (metadataError) throw new Error(`creator match metadata: ${metadataError.message}`);
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

    return json({
      ok: true,
      labels: finalLabels,
      ...classificationResult,
    });
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
