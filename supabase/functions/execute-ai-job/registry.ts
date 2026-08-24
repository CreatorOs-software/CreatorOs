import { ZodSchema } from "npm:zod@3";
import { AIProviderAdapter, AIRequest } from "./adapters/types.ts";
import { AnthropicAdapter } from "./adapters/anthropic.ts";
import { OpenAIAdapter } from "./adapters/openai.ts";
import { incomingEmailAnalysisPrompt } from "./tasks/incoming-email-analysis/prompt.ts";
import { emailLabelPrompt } from "./tasks/email-label/prompt.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AIProvider = "anthropic" | "openai";

export type AITaskType =
  | "INCOMING_EMAIL_ANALYSIS"
  | "EMAIL_LABEL";

// Each task declares its own provider + model.
// The Edge Function uses `provider` to pick the adapter, `model` is passed
// through to the API call unchanged.
export type PromptDefinition<TCtx = unknown, TOut = unknown> = {
  version:          string;       // e.g. 'INCOMING_EMAIL_v1.0' — stored in ai_executions
  provider:         AIProvider;
  model:            string;       // exact model ID passed to the provider API
  maxTokens:        number;
  estimatedCredits: number;       // reserved before execution; refunded/adjusted after
  system:           string;
  buildMessages:    (ctx: TCtx) => { role: "user"; content: string }[];
  outputSchema:     ZodSchema<TOut>;
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

// satisfies ensures every AITaskType has an entry and types are inferred correctly.
export const PROMPT_REGISTRY = {
  INCOMING_EMAIL_ANALYSIS: incomingEmailAnalysisPrompt,
  EMAIL_LABEL:             emailLabelPrompt,
} satisfies Record<AITaskType, PromptDefinition>;

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
