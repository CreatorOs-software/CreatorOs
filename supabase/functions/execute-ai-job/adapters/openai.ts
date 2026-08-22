import { AIProviderAdapter, AIRequest, AIResponse } from "./types.ts";

export class OpenAIAdapter implements AIProviderAdapter {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async execute(req: AIRequest): Promise<AIResponse> {
    const start = Date.now();

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        model:      req.model,
        max_tokens: req.maxTokens,
        messages: [
          { role: "system", content: req.system },
          ...req.messages,
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenAI ${res.status}: ${body}`);
    }

    const data = await res.json();

    return {
      content:      data.choices[0].message.content,
      inputTokens:  data.usage.prompt_tokens,
      outputTokens: data.usage.completion_tokens,
      latencyMs:    Date.now() - start,
    };
  }
}
