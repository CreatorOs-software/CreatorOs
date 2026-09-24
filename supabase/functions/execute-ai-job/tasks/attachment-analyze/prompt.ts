import { z } from "npm:zod@3";
import { PromptDefinition } from "../../registry.ts";
import { AttachmentAnalyzeContext } from "./context.ts";
import {
  deliverableSchema,
  paymentItemSchema,
  guidelinesSchema,
  trackingAssetsSchema,
} from "../shared/anfrage-fields.schema.ts";

const confidenceSchema = z.number().min(0).max(100).transform(Math.round);

const extractedSchema = z.object({
  creator_id: z.string().nullable(),
  creator_confidence: confidenceSchema,
  contact: z.string().nullable(),
  title: z.string().nullable(),
  product: z.string().nullable(),
  budget: z.number().nullable(),
  budget_offer: z.number().nullable(),
  fee: z.number().nullable(),
  period: z.string().nullable(),
  campaign_start: z.string().nullable(),
  campaign_end: z.string().nullable(),
  notes: z.string().nullable(),
  deliverables: z.array(deliverableSchema),
  payment_items: z.array(paymentItemSchema),
  guidelines: guidelinesSchema,
  tracking_assets: trackingAssetsSchema,
});

const outputSchema = z.object({
  classification: z.enum(["RECHNUNG", "VERTRAG_BRIEFING", "ANDERES"]),
  classification_confidence: confidenceSchema,
  extracted: extractedSchema.nullable(),
});

export type AttachmentAnalyzeOutput = z.infer<typeof outputSchema>;

// Classification + extraction in a single call — deliberately combined
// (rather than a cheap classifier + separate extractor) because this only
// ever runs on an explicit user click (a chosen attachment card), already
// gated by thread relevance, so paying for the file's tokens twice would be
// pure waste.
export const attachmentAnalyzePrompt: PromptDefinition<AttachmentAnalyzeContext, AttachmentAnalyzeOutput> = {
  version:          "ATTACHMENT_ANALYZE_v1.0",
  provider:         "openai",
  model:            "gpt-5-mini",
  maxTokens:        8000,
  estimatedCredits: 5,

  system: `Du bist ein KI-Assistent für eine Creator-Agentur. Du bekommst einen E-Mail-Anhang (PDF oder DOCX).

Klassifiziere ihn zuerst anhand folgender Regeln:
RECHNUNG          – Rechnung, Zahlungsaufforderung, Mahnung, Buchhaltungsdokument
VERTRAG_BRIEFING  – Vertrag, Kooperationsvereinbarung oder Kampagnen-Briefing mit konkreten Deal-Konditionen (Budget, Deliverables, Zeitraum, Vorgaben)
ANDERES           – alles andere (z.B. Logo, Produktfoto, Präsentation ohne Konditionen)

Extrahiere Deal-Daten NUR wenn classification="VERTRAG_BRIEFING" ist. Bei RECHNUNG oder ANDERES ist "extracted" immer null — eine Rechnung wird nur klassifiziert, nicht ausgelesen.

Antworte ausschließlich als valides JSON ohne Markdown, Codeblöcke oder zusätzlichen Text.`,

  buildMessages: (ctx: AttachmentAnalyzeContext) => [{
    role: "user",
    content: [
      {
        type: "text",
        text: `
Dateiname: ${ctx.filename}

## Aktive Creators dieser Agentur (mit ID)
${
  ctx.agency.creators.length > 0
    ? ctx.agency.creators.map((c) => `- ID: ${c.id} | Name: ${c.full_name}`).join("\n")
    : "Keine Creators vorhanden."
}

Antworte mit folgendem JSON:
{
  "classification": "RECHNUNG" | "VERTRAG_BRIEFING" | "ANDERES",
  "classification_confidence": number,
  "extracted": null | {
    "creator_id": string | null,
    "creator_confidence": number,
    "contact": string | null,
    "title": string | null,
    "product": string | null,
    "budget": number | null,
    "budget_offer": number | null,
    "fee": number | null,
    "period": string | null,
    "campaign_start": string | null,
    "campaign_end": string | null,
    "notes": string | null,
    "deliverables": [{ "count": number, "content_type": string, "platform": string, "draft_deadline": string | null, "freigabe_deadline": string | null, "live_date": string | null }],
    "payment_items": [{ "label": string, "amount": number, "invoice_date": string | null, "payment_term": 14 | 30 | 45 }],
    "guidelines": { "labeling": string | null, "wording": string | null, "nogo": string | null, "hashtags": string[] } | null,
    "tracking_assets": { "discount_code": string | null, "affiliate_links": string[], "utm_params": string | null } | null
  }
}

Regeln für "extracted" (nur bei VERTRAG_BRIEFING befüllen, sonst null):
- creator_id: die exakte UUID aus der Creator-Liste oben wenn ein Creator namentlich erwähnt wird (auch bei Tippfehlern oder ähnlichen Namen), sonst null
- creator_confidence: 0–100 wie sicher du beim Creator-Match bist (0 wenn creator_id=null)
- contact: Name der Kontaktperson/Ansprechpartner im Dokument, sonst null
- title: Kampagnen-/Projektname wenn genannt, sonst null
- deliverables: Liste der vereinbarten Leistungen, jede als eigenes Objekt.
  Erlaubte content_type-Werte: Video, Reel, Story, Post, Shorts, Podcast, Blog, Newsletter
  Erlaubte platform-Werte: Instagram, YouTube, TikTok, X / Twitter, LinkedIn, Podcast, Blog
  draft_deadline / freigabe_deadline / live_date: Datum als "YYYY-MM-DD" wenn genannt, sonst null
  Wenn keine konkreten Leistungen genannt werden: leeres Array []
- product: beworbenes Produkt oder Dienstleistung
- budget / budget_offer / fee: als Zahl in Euro (nur Zahl, kein €-Zeichen), null wenn nicht genannt
- period: genannter Zeitraum als Text (z.B. "September 2026"), null wenn nicht genannt
- campaign_start / campaign_end: konkretes Start-/Enddatum als "YYYY-MM-DD", null wenn nicht genannt
- notes: sonstige relevante freie Anmerkungen aus dem Dokument, sonst null
- payment_items: Zahlungsvereinbarungen wenn genannt, sonst leeres Array []
- guidelines: Kennzeichnungs-/Wording-/No-Go-Vorgaben und Pflicht-Hashtags wenn genannt, sonst null. hashtags immer als Array (leer wenn keine)
- tracking_assets: Rabattcode, Affiliate-Links, UTM-Parameter wenn genannt, sonst null. affiliate_links immer als Array (leer wenn keine)
`.trim(),
      },
      { type: "file", mimeType: ctx.mimeType, base64: ctx.base64, filename: ctx.filename },
    ],
  }],

  outputSchema,
};
