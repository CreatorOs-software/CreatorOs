import { AIProviderAdapter, AIRequest, AIResponse } from "./types.ts";

export class OpenAIAdapter implements AIProviderAdapter {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async execute(req: AIRequest): Promise<AIResponse> {
    const start = Date.now();

    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        model:             req.model,
        max_output_tokens: req.maxTokens,
        instructions:      req.system,
        input:             req.messages,
        store:             false,
      }),
    });

    const rawBody = await res.text();

    if (!res.ok) {
      throw new Error(`OpenAI ${res.status}: ${rawBody}`);
    }

    let data: { status?: string; incomplete_details?: { reason: string }; output?: { type: string; content?: { type: string; text?: string }[] }[]; usage?: { input_tokens: number; output_tokens: number } };
    try {
      data = JSON.parse(rawBody);
    } catch {
      throw new Error(`OpenAI response is not valid JSON: ${rawBody.slice(0, 200)}`);
    }

    if (data.status === "incomplete") {
      throw new Error(`OpenAI response incomplete (reason: ${data.incomplete_details?.reason ?? "unknown"}) — increase max_output_tokens`);
    }

    if (!Array.isArray(data.output)) {
      throw new Error(`OpenAI response missing 'output': ${rawBody.slice(0, 400)}`);
    }

    const text = data.output
      .filter((o) => o.type === "message")
      .flatMap((o) => o.content ?? [])
      .filter((c) => c.type === "output_text")
      .map((c) => c.text ?? "")
      .join("");

    if (!text) {
      console.error("OpenAI returned empty content. Full response:", rawBody.slice(0, 800));
      throw new Error(`OpenAI returned empty content. Response: ${rawBody.slice(0, 400)}`);
    }

    return {
      content:      text,
      inputTokens:  data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
      latencyMs:    Date.now() - start,
    };
  }
}
