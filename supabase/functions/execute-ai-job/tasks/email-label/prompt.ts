import { z } from "zod";
import { PromptDefinition } from "../../registry.ts";

type EmailLabelContext = {
  subject: string;
  body:    string;
};

const CLASSIFIABLE_LABELS = ["ANFRAGE", "PROMOTIONS", "RECHNUNG", "ANDERES"] as const;

const outputSchema = z.object({
  labels: z.array(z.enum(CLASSIFIABLE_LABELS)).min(1).max(3),
});

export type EmailLabelOutput = z.infer<typeof outputSchema>;

// nano: reine Klassifikation, kein generativer Output nötig.
export const emailLabelPrompt: PromptDefinition<EmailLabelContext, EmailLabelOutput> = {
  version:          "EMAIL_LABEL_v1.1",
  provider:         "openai",
  model:            "gpt-5-nano",
  maxTokens:        512,
  estimatedCredits: 1,

  system: `Du bist ein KI-Assistent für eine Creator-Agentur.
Klassifiziere eingehende E-Mails anhand folgender Label-Regeln:

ANFRAGE     – Kooperationsanfrage, Buchungsanfrage oder Erstkontakt von einer Brand/Agentur die eine Zusammenarbeit mit einem Creator möchte (z.B. "Wir würden gerne mit euch kooperieren", "Anfrage für einen Sponsored Post", "Interesse an einer Partnerschaft")
PROMOTIONS  – Newsletter, Werbemails, Marketing-Kampagnen, automatisch versendete Mails ohne direkten Handlungsbedarf
RECHNUNG    – Rechnungsstellung, Zahlungsaufforderung, Mahnungen, Buchhaltungs-E-Mails
ANDERES     – alles was nicht eindeutig in ANFRAGE, PROMOTIONS oder RECHNUNG fällt (z.B. allgemeine Fragen, Support, interne Mails)

Vergib 1–3 passende Labels. Ein Label nur setzen wenn du dir sicher bist.
Antworte ausschließlich als valides JSON ohne zusätzlichen Text.`,

  buildMessages: (ctx: EmailLabelContext) => [{
    role: "user",
    content: `Betreff: ${ctx.subject}\n\n${ctx.body.slice(0, 1000)}\n\nAntworte: {"labels": ["ANFRAGE"|"PROMOTIONS"|"RECHNUNG"|"ANDERES"]}`,
  }],

  outputSchema,
};
