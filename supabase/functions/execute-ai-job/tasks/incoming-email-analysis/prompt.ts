import { z } from "zod";
import { PromptDefinition } from "../../registry.ts";
import { EmailAnalysisContext } from "./context.ts";

// mini: strukturierte Extraktion + Reply-Entwurf — ausgewogenes Preis-Leistungs-Verhältnis.
// gpt-5 wäre nur nötig wenn Reply-Qualität oder Extraktion deutlich verbessert werden muss.
const outputSchema = z.object({
  is_request: z.boolean(),
  information_complete: z.boolean(),
  missing_information: z.array(z.string()),
  suggested_reply: z.string().nullable(),
  matched_brand_name: z.string().nullable(),
});

export type EmailAnalysisOutput = z.infer<typeof outputSchema>;

export const incomingEmailAnalysisPrompt: PromptDefinition<
  EmailAnalysisContext,
  EmailAnalysisOutput
> = {
  version: "INCOMING_EMAIL_v1.1",
  provider: "openai",
  model: "gpt-5-mini",
  maxTokens: 1024,
  estimatedCredits: 5,

  system: `Du bist ein KI-Assistent für eine Creator-Agentur.
Deine Aufgabe ist es, eingehende E-Mails zu analysieren.
Antworte ausschließlich als valides JSON ohne Markdown, Codeblöcke oder zusätzlichen Text.`,

  buildMessages: (ctx: EmailAnalysisContext) => [
    {
      role: "user",
      content: `
## Eingehende E-Mail
Absender: ${ctx.email.sender_name ?? ctx.email.sender_email} <${ctx.email.sender_email}>
Betreff: ${ctx.email.subject}

${ctx.email.body}

## Konversations-Kontext
${
  ctx.conversation.has_linked_anfrage
    ? `Diese E-Mail gehört zu einer laufenden Konversation die bereits mit einer Anfrage verknüpft ist. Das Label "LAUFEND" wurde automatisch vergeben — du kannst bis zu 2 WEITERE Labels aus [ANFRAGE, PROMOTIONS, RECHNUNG, ANDERES] vergeben (oder ein leeres Array wenn keine weiteren passen).`
    : ctx.conversation.is_follow_up
      ? `Diese E-Mail ist Teil einer laufenden Konversation (${ctx.conversation.prior_emails_count} vorherige E-Mail(s)). Vergib 1–3 passende Labels.`
      : "Diese E-Mail ist der erste Kontakt. Vergib 1–3 passende Labels."
}

## Bekannte Brands dieser Agentur
${
  ctx.agency.known_brands.length > 0
    ? ctx.agency.known_brands
        .map(
          (b) => `- ${b.company_name}${b.industry ? ` (${b.industry})` : ""}`,
        )
        .join("\n")
    : "Keine Brands vorhanden."
}

## Aktive Creators
${
  ctx.agency.creators.length > 0
    ? ctx.agency.creators
        .map(
          (c) =>
            `- ${c.full_name}: ${c.niche.join(", ")}${c.min_budget ? `, Mindestbudget €${c.min_budget}` : ""}`,
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
  "matched_brand_name": string | null
}

Regeln:
- is_request: true wenn es sich um eine Kooperations- oder Buchungsanfrage handelt
- information_complete: true nur wenn Budget, Deadline und Format bekannt sind
- missing_information: nur Felder die tatsächlich fehlen
- suggested_reply: nur wenn information_complete=false und is_request=true, sonst null
- matched_brand_name: Company-Name aus der Liste oben wenn Absender erkannt, sonst null
`.trim(),
    },
  ],

  outputSchema,
};
