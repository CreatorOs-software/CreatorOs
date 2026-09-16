export type ReasoningEffort = "minimal" | "low" | "medium" | "high";

export type AIContentPart =
  | { type: "text"; text: string }
  | { type: "file"; mimeType: string; base64: string; filename?: string };

export type AIMessage = { role: "user"; content: string | AIContentPart[] };

export type AIRequest = {
  system:   string;
  messages: AIMessage[];
  model:    string;
  maxTokens: number;
  /** Optional reasoning effort (OpenAI reasoning models only; ignored elsewhere). */
  reasoning?: ReasoningEffort;
};

export type AIResponse = {
  content:      string;
  inputTokens:  number;
  outputTokens: number;
  latencyMs:    number;
};

export interface AIProviderAdapter {
  /** One-shot call — returns the full response once complete. */
  execute(req: AIRequest): Promise<AIResponse>;
  /**
   * Streaming call — resolves to a stream of text deltas as the model
   * produces them. Providers without streaming support reject.
   */
  executeStream(req: AIRequest): Promise<ReadableStream<string>>;
}
