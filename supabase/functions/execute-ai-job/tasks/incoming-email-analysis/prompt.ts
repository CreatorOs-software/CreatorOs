import { z } from "npm:zod@3";
import { PromptDefinition } from "../../registry.ts";
import { EmailAnalysisContext } from "./context.ts";

const deliverableSchema = z.object({
  count: z.number().int().min(1),
  content_type: z.string(),
  platform: z.string(),
  draft_deadline: z.string().nullable(),
  freigabe_deadline: z.string().nullable(),
  live_date: z.string().nullable(),
});

const paymentItemSchema = z.object({
  label: z.string(),
  amount: z.number(),
  invoice_date: z.string().nullable(),
  payment_term: z.union([z.literal(14), z.literal(30), z.literal(45)]),
});

const guidelinesSchema = z
  .object({
    labeling: z.string().nullable(),
    wording: z.string().nullable(),
    nogo: z.string().nullable(),
    hashtags: z.array(z.string()),
  })
  .nullable();

const trackingAssetsSchema = z
  .object({
    discount_code: z.string().nullable(),
    affiliate_links: z.array(z.string()),
    utm_params: z.string().nullable(),
  })
  .nullable();

const outputSchema = z.object({
  is_request: z.boolean(),
  information_complete: z.boolean(),
  missing_information: z.array(z.string()),
  suggested_reply: z.string().nullable(),
  creator_id: z.string().nullable(),
  creator_confidence: z.number().int().min(0).max(100),
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

export type EmailAnalysisOutput = z.infer<typeof outputSchema>;

export const incomingEmailAnalysisPrompt: PromptDefinition<
  EmailAnalysisContext,
  EmailAnalysisOutput
> = {
  version: "INCOMING_EMAIL_v4.0",
  provider: "openai",
  model: "gpt-5-mini",
  maxTokens: 8000,
  estimatedCredits: 5,

  system: `Du bist ein KI-Assistent für eine Creator-Agentur.
Deine Aufgabe ist es, eingehende E-Mails zu analysieren und strukturierte Daten zu extrahieren.
Antworte ausschließlich als valides JSON ohne Markdown, Codeblöcke oder zusätzlichen Text.`,

  buildMessages: (ctx: EmailAnalysisContext) => [
    {
      role: "user",
      content: `
## Eingehende E-Mail
Absender: ${ctx.email.sender_name ?? ctx.email.sender_email} <${ctx.email.sender_email}>
Betreff: ${ctx.email.subject}

${ctx.email.body}
${
  ctx.conversation.is_follow_up
    ? "\n## Hinweis\nDies ist eine Folge-Mail in einer laufenden Konversation. Extrahiere nur, was in DIESER E-Mail steht.\n"
    : ""
}${
  ctx.currentAnfrage
    ? `\n## Bereits erfasste Anfrage-Daten (nur zur Orientierung – NICHT übernehmen, nur was in dieser E-Mail steht extrahieren)\n${JSON.stringify(ctx.currentAnfrage, null, 2)}\n`
    : ""
}
## Aktive Creators dieser Agentur (mit ID)
${
  ctx.agency.creators.length > 0
    ? ctx.agency.creators
        .map(
          (c) =>
            `- ID: ${c.id} | Name: ${c.full_name} | Nischen: ${c.niche.join(", ")}${c.min_budget ? ` | Mindestbudget: €${c.min_budget}` : ""}`,
        )
        .join("\n")
    : "Keine Creators vorhanden."
}

Analysiere die E-Mail und antworte mit folgendem JSON (jeder Key MUSS vorhanden sein – nutze null bzw. [] wenn nichts genannt wird):
{
  "is_request": boolean,
  "information_complete": boolean,
  "missing_information": string[],
  "suggested_reply": string | null,
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

Regeln:
- is_request: true wenn es sich um eine Kooperations- oder Buchungsanfrage handelt
- information_complete: true nur wenn Budget, Deadline und mindestens ein Deliverable bekannt sind
- missing_information: nur Felder die tatsächlich fehlen (z.B. ["Budget", "Zeitraum"])
- suggested_reply: kurzer Antwort-Entwurf auf Deutsch wenn is_request=true und information_complete=false, sonst null
- creator_id: die exakte UUID aus der Creator-Liste oben wenn ein Creator namentlich erwähnt wird (auch bei Tippfehlern oder ähnlichen Namen), sonst null
- creator_confidence: 0–100 wie sicher du beim Creator-Match bist (0 wenn creator_id=null)
- contact: Name der Kontaktperson aus der E-Mail
- title: kurzer Titel/Kampagnenname wenn genannt, sonst null
- deliverables: Liste der angefragten Leistungen, jede als eigenes Objekt. Beispiele:
    "1x Reel + 3x Story" → [{"count":1,"content_type":"Reel","platform":"Instagram","draft_deadline":null,"freigabe_deadline":null,"live_date":null}, ...]
    "YouTube Video + TikTok Clip" → [{"count":1,"content_type":"Video","platform":"YouTube",...},{"count":1,"content_type":"Video","platform":"TikTok",...}]
  Erlaubte content_type-Werte: Video, Reel, Story, Post, Shorts, Podcast, Blog, Newsletter
  Erlaubte platform-Werte: Instagram, YouTube, TikTok, X / Twitter, LinkedIn, Podcast, Blog
  draft_deadline / freigabe_deadline / live_date: Datum als "YYYY-MM-DD" wenn für dieses Deliverable genannt, sonst null
  Wenn keine konkreten Leistungen genannt werden: leeres Array []
- product: beworbenes Produkt oder Dienstleistung
- budget: vom Absender genanntes/angefragtes Budget als Zahl in Euro (nur Zahl, kein €-Zeichen), null wenn nicht genannt
- budget_offer: unser Gegenangebot/genannter Preis von unserer Seite als Zahl, null wenn nicht genannt
- fee: fixes Honorar als Zahl wenn explizit genannt, sonst null
- period: gewünschter Zeitraum als Text (z.B. "September 2026"), null wenn nicht genannt
- campaign_start / campaign_end: konkretes Start-/Enddatum der Kampagne als "YYYY-MM-DD", null wenn nicht genannt
- notes: sonstige relevante freie Anmerkungen aus der E-Mail, sonst null
- payment_items: Zahlungsvereinbarungen wenn genannt (label z.B. "Anzahlung", amount als Zahl, invoice_date "YYYY-MM-DD" oder null, payment_term Zahlungsziel in Tagen: 14, 30 oder 45). Sonst leeres Array []
- guidelines: Kennzeichnungs-/Wording-/No-Go-Vorgaben und Pflicht-Hashtags wenn genannt, sonst null. hashtags immer als Array (leer wenn keine)
- tracking_assets: Rabattcode, Affiliate-Links, UTM-Parameter wenn genannt, sonst null. affiliate_links immer als Array (leer wenn keine)
`.trim(),
    },
  ],

  outputSchema,
};
