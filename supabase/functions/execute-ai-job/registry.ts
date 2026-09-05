import { ZodSchema } from "npm:zod@3";
import { AIProviderAdapter, ReasoningEffort } from "./adapters/types.ts";
import { AnthropicAdapter } from "./adapters/anthropic.ts";
import { OpenAIAdapter } from "./adapters/openai.ts";
import { incomingEmailAnalysisPrompt } from "./tasks/incoming-email-analysis/prompt.ts";
import { emailLabelPrompt } from "./tasks/email-label/prompt.ts";
import { emailDraftProofreadPrompt } from "./tasks/email-proofread/prompt.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AIProvider = "anthropic" | "openai";

export type AITaskType =
  | "INCOMING_EMAIL_ANALYSIS"
  | "EMAIL_LABEL"
  | "EMAIL_DRAFT_PROOFREAD";

// `mode` decides how the Edge Function consumes the model output:
//   "structured" (default) — one JSON blob, validated by `outputSchema`
//   "stream"               — free-form text, streamed to the caller
//                            (`outputSchema` is `z.string()`, unused at runtime)
export type PromptMode = "structured" | "stream";

// Each task declares its own provider + model.
// The Edge Function uses `provider` to pick the adapter; `model` and
// `reasoning` are passed through to the provider API unchanged.
export type PromptDefinition<TCtx = unknown, TOut = unknown> = {
  version:          string;       // e.g. 'INCOMING_EMAIL_v1.0' — stored in ai_executions
  provider:         AIProvider;
  model:            string;       // exact model ID passed to the provider API
  maxTokens:        number;
  estimatedCredits: number;       // reserved before execution; refunded/adjusted after
  reasoning?:       ReasoningEffort;
  mode?:            PromptMode;    // defaults to "structured"
  system:           string;
  buildMessages:    (ctx: TCtx) => { role: "user"; content: string }[];
  outputSchema:     ZodSchema<TOut>;
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

// satisfies ensures every AITaskType has an entry and types are inferred correctly.
// `<never>` for the context type-param: `buildMessages` params are contravariant,
// so every task's concrete context satisfies it without widening the entries.
export const PROMPT_REGISTRY = {
  INCOMING_EMAIL_ANALYSIS: incomingEmailAnalysisPrompt,
  EMAIL_LABEL:             emailLabelPrompt,
  EMAIL_DRAFT_PROOFREAD:   emailDraftProofreadPrompt,
} satisfies Record<AITaskType, PromptDefinition<never>>;

// ---------------------------------------------------------------------------
// Adapter factory
// ---------------------------------------------------------------------------
// Returns the correct adapter for a given provider.
// API keys come exclusively from Deno.env (Supabase Secrets), never from DB.

export function getAdapter(provider: AIProvider): AIProviderAdapter {
  switch (provider) {
    case "anthropic":
      return new AnthropicAdapter(Deno.env.get("ANTHROPIC_API_KEY")!);
    case "openai":
      return new OpenAIAdapter(Deno.env.get("OPENAI_API_KEY")!);
  }
}
