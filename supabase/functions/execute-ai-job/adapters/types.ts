export type ReasoningEffort = "minimal" | "low" | "medium" | "high";

export type AIRequest = {
  system:   string;
  messages: { role: "user"; content: string }[];
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
