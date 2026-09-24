import { z } from "npm:zod@3";
import { PromptDefinition } from "../../registry.ts";
import { CreatorRequestMatchingContext } from "./context.ts";

const confidenceSchema = z.number().min(0).max(100).transform(Math.round);

const dimensionSchema = z.object({
  score: confidenceSchema.nullable(),
  status: z.enum(["strong", "conditional", "weak", "unknown"]),
  explanation: z.string(),
  evidence: z.array(z.string()),
});

export const creatorRequestMatchingOutputSchema = z.object({
  score: confidenceSchema,
  confidence: confidenceSchema,
  verdict: z.enum(["strong", "conditional", "weak"]),
  summary: z.string(),
  dimensions: z.object({
    goal_fit: dimensionSchema,
    content_fit: dimensionSchema,
    budget_fit: dimensionSchema,
    timing_fit: dimensionSchema,
    brand_fit: dimensionSchema,
  }),
  strengths: z.array(z.string()),
  concerns: z.array(z.string()),
  missing_information: z.array(z.string()),
  suggested_questions: z.array(z.string()),
  recommendation: z.string(),
});

export type CreatorRequestMatchingOutput = z.infer<typeof creatorRequestMatchingOutputSchema>;

export const creatorRequestMatchingPrompt: PromptDefinition<
  CreatorRequestMatchingContext,
  CreatorRequestMatchingOutput
> = {
  version: "CREATOR_REQUEST_MATCHING_v1.0",
  provider: "openai",
  model: "gpt-5-mini",
  maxTokens: 5000,
  estimatedCredits: 3,
  system: `Du bewertest Kooperationsanfragen für eine Creator-Agentur. Bewerte ausschließlich anhand des gelieferten Kontexts. Erfinde keine Fakten. Fehlende Informationen führen zu "unknown". Harte deterministische Regeln haben Vorrang. Antworte ausschließlich als valides JSON.`,
  buildMessages: (ctx) => [{
    role: "user",
    content: `Bewerte, wie gut die Anfrage zum Creator passt.

## Kontext
${JSON.stringify(ctx, null, 2)}

## Ausgabe
{
  "score": 0-100,
  "confidence": 0-100,
  "verdict": "strong" | "conditional" | "weak",
  "summary": string,
  "dimensions": {
    "goal_fit": { "score": number|null, "status": "strong"|"conditional"|"weak"|"unknown", "explanation": string, "evidence": string[] },
    "content_fit": { "score": number|null, "status": "strong"|"conditional"|"weak"|"unknown", "explanation": string, "evidence": string[] },
    "budget_fit": { "score": number|null, "status": "strong"|"conditional"|"weak"|"unknown", "explanation": string, "evidence": string[] },
    "timing_fit": { "score": number|null, "status": "strong"|"conditional"|"weak"|"unknown", "explanation": string, "evidence": string[] },
    "brand_fit": { "score": number|null, "status": "strong"|"conditional"|"weak"|"unknown", "explanation": string, "evidence": string[] }
  },
  "strengths": string[],
  "concerns": string[],
  "missing_information": string[],
  "suggested_questions": string[],
  "recommendation": string
}

Regeln:
- Ein fehlendes Budget ergibt budget_fit.status="unknown" und score=null.
- Ein fehlender Zeitraum ergibt timing_fit.status="unknown" und score=null.
- Bei einer deterministischen fail-Regel darf verdict nie "strong" sein.
- Formuliere konkret, knapp und auf Deutsch.
- evidence darf nur Informationen aus dem Kontext enthalten.`,
  }],
  outputSchema: creatorRequestMatchingOutputSchema,
};
