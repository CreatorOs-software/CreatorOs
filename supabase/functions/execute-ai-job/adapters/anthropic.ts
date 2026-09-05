import { AIProviderAdapter, AIRequest, AIResponse } from "./types.ts";

export class AnthropicAdapter implements AIProviderAdapter {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  executeStream(_req: AIRequest): Promise<ReadableStream<string>> {
    return Promise.reject(new Error("AnthropicAdapter: streaming not implemented"));
  }

  async execute(req: AIRequest): Promise<AIResponse> {
    const start = Date.now();

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key":         this.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
      },
      body: JSON.stringify({
        model:      req.model,
        max_tokens: req.maxTokens,
        system:     req.system,
        messages:   req.messages,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Anthropic ${res.status}: ${body}`);
    }

    const data = await res.json();

    return {
      content:      data.content[0].text,
      inputTokens:  data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
      latencyMs:    Date.now() - start,
    };
  }
}
