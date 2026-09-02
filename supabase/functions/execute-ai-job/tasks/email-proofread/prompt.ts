import { z } from "npm:zod@3";
import { PromptDefinition } from "../../registry.ts";

export type EmailProofreadContext = {
  /** The user's draft, verbatim. */
  text: string;
};

// mini: leichte Korrektur, aber generativer Klartext-Output → streaming.
// `outputSchema` ist z.string() (Klartext); im "stream"-Modus ungenutzt.
export const emailDraftProofreadPrompt: PromptDefinition<
  EmailProofreadContext,
  string
> = {
  version:          "EMAIL_PROOFREAD_v1.0",
  provider:         "openai",
  model:            "gpt-5-mini",
  maxTokens:        4096,
  estimatedCredits: 1,
  reasoning:        "minimal",
  mode:             "stream",

  system: `Du bist ein Korrektor für geschäftliche E-Mails einer Creator-Agentur.
Korrigiere ausschließlich Rechtschreibung, Grammatik und Zeichensetzung des folgenden Textes.

Regeln:
- Gib NUR den korrigierten Text zurück — keine Erklärungen, keine Anführungszeichen, kein Markdown.
- Behalte Sprache, Tonfall, Anrede, Absätze und Zeilenumbrüche exakt bei.
- Ändere weder Inhalt noch Bedeutung. Formuliere nicht um, kürze nicht, ergänze nichts.
- Platzhalter wie \${creator.name} bleiben unverändert.`,

  buildMessages: (ctx: EmailProofreadContext) => [
    { role: "user", content: ctx.text },
  ],

  outputSchema: z.string(),
};
