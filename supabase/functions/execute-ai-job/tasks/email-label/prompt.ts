import { z } from "npm:zod@3";
import { PromptDefinition } from "../../registry.ts";
import { EmailLabelContext } from "./context.ts";

const CLASSIFIABLE_LABELS = [
  "ANFRAGE",
  "PROMOTIONS",
  "RECHNUNG",
  "ANDERES",
] as const;

const confidenceSchema = z.number().min(0).max(100).transform(Math.round);

const outputSchema = z.object({
  labels: z.array(z.enum(CLASSIFIABLE_LABELS)).min(1).max(3),
  creator_matches: z.array(
    z.object({
      creator_id: z.string().uuid(),
      confidence: confidenceSchema,
      relation: z.enum([
        "required",
        "alternative",
        "group",
        "mentioned",
        "unknown",
      ]),
      evidence: z.string(),
      request_group_key: z.string().nullable(),
    }),
  ),
  request_structure: z.enum([
    "single_request_single_creator",
    "single_request_multiple_creators",
    "multiple_distinct_requests",
    "unclear",
  ]),
  structure_confidence: confidenceSchema,
});

export type EmailLabelOutput = z.infer<typeof outputSchema>;

// nano: reine Klassifikation, kein generativer Output nötig.
export const emailLabelPrompt: PromptDefinition<
  EmailLabelContext,
  EmailLabelOutput
> = {
  version: "EMAIL_LABEL_v1.2",
  provider: "openai",
  model: "gpt-5-nano",
  maxTokens: 512,
  estimatedCredits: 1,
  reasoning: "minimal",

  system: `Du bist ein KI-Assistent für eine Creator-Agentur.
Klassifiziere eingehende E-Mails anhand folgender Label-Regeln:

ANFRAGE     – Kooperationsanfrage, Buchungsanfrage oder Erstkontakt von einer Brand/Agentur die eine Zusammenarbeit mit einem Creator möchte (z.B. "Wir würden gerne mit euch kooperieren", "Anfrage für einen Sponsored Post", "Interesse an einer Partnerschaft")
PROMOTIONS  – Newsletter, Werbemails, Marketing-Kampagnen, automatisch versendete Mails ohne direkten Handlungsbedarf
RECHNUNG    – Rechnungsstellung, Zahlungsaufforderung, Mahnungen, Buchhaltungs-E-Mails
ANDERES     – alles was nicht eindeutig in ANFRAGE, PROMOTIONS oder RECHNUNG fällt (z.B. allgemeine Fragen, Support, interne Mails)

Vergib 1–3 passende Labels und ordne alle konkret betroffenen Creator zu. Unterscheide gemeinsame Anfragen, Alternativen und mehrere getrennte Briefings. Verwende ausschließlich Creator-IDs aus der gelieferten Liste.
Antworte ausschließlich als valides JSON ohne zusätzlichen Text.`,

  buildMessages: (ctx: EmailLabelContext) => [
    {
      role: "user",
      content: `Betreff: ${ctx.email.subject}\n\n${ctx.email.body}\n\nAktive Creator:\n${ctx.creators.map((creator) => `- ${creator.id} | Name: ${creator.full_name} | Nischen: ${creator.niche.join(", ") || "keine"}`).join("\n") || "Keine"}\n\nCreator des empfangenden Postfachs: ${ctx.mailbox_creator_id ?? "keiner"}\n\nAntworte exakt als JSON:\n{"labels":["ANFRAGE"|"PROMOTIONS"|"RECHNUNG"|"ANDERES"],"creator_matches":[{"creator_id":"UUID","confidence":0,"relation":"required"|"alternative"|"group"|"mentioned"|"unknown","evidence":"kurzer Beleg","request_group_key":"gruppe-1"|null}],"request_structure":"single_request_single_creator"|"single_request_multiple_creators"|"multiple_distinct_requests"|"unclear","structure_confidence":0}\n\nRegeln:\n- Gleiche Namen unabhängig von Groß-/Kleinschreibung und beachte naheliegende Schreibvarianten.\n- confidence und structure_confidence sind Prozentwerte von 0 bis 100. 100 bedeutet vollständig sicher; 1 bedeutet nur 1 % sicher.\n- required: verbindlich angefragt. alternative: A oder B. group: A und B gemeinsam. mentioned: nur erwähnt.\n- Creator derselben fachlichen Anfrage erhalten denselben request_group_key; getrennte Briefings unterschiedliche Keys.\n- Das Postfach ist nur ein schwaches Signal. Ein ausdrücklich genannter anderer Creator hat Vorrang.\n- Ohne erkennbaren Creator creator_matches=[].`,
    },
  ],

  outputSchema,
};
