export type AIRequest = {
  system:   string;
  messages: { role: "user"; content: string }[];
  model:    string;
  maxTokens: number;
};

export type AIResponse = {
  content:      string;
  inputTokens:  number;
  outputTokens: number;
  latencyMs:    number;
};

export interface AIProviderAdapter {
  execute(req: AIRequest): Promise<AIResponse>;
}
