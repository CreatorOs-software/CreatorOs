import { z } from "zod";
import { PromptDefinition } from "../../registry.ts";

type EmailLabelContext = {
  subject: string;
  body:    string;
};

const outputSchema = z.object({
  label: z.enum(["REQUEST", "INFO", "SPAM", "PERSONAL", "OTHER"]),
});

export type EmailLabelOutput = z.infer<typeof outputSchema>;

// nano: reine Klassifikation, kein generativer Output nötig.
export const emailLabelPrompt: PromptDefinition<EmailLabelContext, EmailLabelOutput> = {
  version:          "EMAIL_LABEL_v1.0",
  provider:         "openai",
  model:            "gpt-5-nano",
  maxTokens:        64,
  estimatedCredits: 1,

  system: `Du bist ein KI-Assistent für eine Creator-Agentur.
Klassifiziere eingehende E-Mails in genau eine Kategorie.
Antworte ausschließlich als valides JSON ohne zusätzlichen Text.`,

  buildMessages: (ctx: EmailLabelContext) => [{
    role: "user",
    content: `Betreff: ${ctx.subject}\n\n${ctx.body.slice(0, 1000)}\n\nAntworte: {"label": "REQUEST"|"INFO"|"SPAM"|"PERSONAL"|"OTHER"}`,
  }],

  outputSchema,
};
