import { z } from "npm:zod@3";
import { PromptDefinition } from "../../registry.ts";
import { EmailAnalysisContext } from "./context.ts";

const outputSchema = z.object({
  is_request: z.boolean(),
  information_complete: z.boolean(),
  missing_information: z.array(z.string()),
  suggested_reply: z.string().nullable(),
  creator_id: z.string().nullable(),
  creator_confidence: z.number().int().min(0).max(100),
  contact: z.string().nullable(),
  format: z.string().nullable(),
  product: z.string().nullable(),
  budget: z.number().nullable(),
  period: z.string().nullable(),
});

export type EmailAnalysisOutput = z.infer<typeof outputSchema>;

export const incomingEmailAnalysisPrompt: PromptDefinition<
  EmailAnalysisContext,
  EmailAnalysisOutput
> = {
  version: "INCOMING_EMAIL_v2.0",
  provider: "openai",
  model: "gpt-5-mini",
  maxTokens: 5024,
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

Analysiere die E-Mail und antworte mit folgendem JSON:
{
  "is_request": boolean,
  "information_complete": boolean,
  "missing_information": string[],
  "suggested_reply": string | null,
  "creator_id": string | null,
  "creator_confidence": number,
  "contact": string | null,
  "format": string | null,
  "product": string | null,
  "budget": number | null,
  "period": string | null
}

Regeln:
- is_request: true wenn es sich um eine Kooperations- oder Buchungsanfrage handelt
- information_complete: true nur wenn Budget, Deadline und Format bekannt sind
- missing_information: nur Felder die tatsächlich fehlen (z.B. ["Budget", "Zeitraum"])
- suggested_reply: kurzer Antwort-Entwurf auf Deutsch wenn is_request=true und information_complete=false, sonst null
- creator_id: die exakte UUID aus der Creator-Liste oben wenn ein Creator namentlich erwähnt wird (auch bei Tippfehlern oder ähnlichen Namen), sonst null
- creator_confidence: 0–100 wie sicher du beim Creator-Match bist (0 wenn creator_id=null)
- contact: Name der Kontaktperson aus der E-Mail
- format: angefordertes Format/Leistung (z.B. "1x Reel + 3x Story")
- product: beworbenes Produkt oder Dienstleistung
- budget: Budgetbetrag als Zahl in Euro (nur Zahl, kein €-Zeichen), null wenn nicht genannt
- period: gewünschter Zeitraum als Text (z.B. "September 2026"), null wenn nicht genannt
`.trim(),
    },
  ],

  outputSchema,
};
