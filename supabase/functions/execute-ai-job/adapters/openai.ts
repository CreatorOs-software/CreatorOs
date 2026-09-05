import { AIProviderAdapter, AIRequest, AIResponse } from "./types.ts";

const RESPONSES_URL = "https://api.openai.com/v1/responses";

export class OpenAIAdapter implements AIProviderAdapter {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private body(req: AIRequest, stream: boolean): string {
    return JSON.stringify({
      model:             req.model,
      max_output_tokens: req.maxTokens,
      instructions:      req.system,
      input:             req.messages,
      store:             false,
      ...(stream ? { stream: true } : {}),
      ...(req.reasoning ? { reasoning: { effort: req.reasoning } } : {}),
    });
  }

  async execute(req: AIRequest): Promise<AIResponse> {
    const start = Date.now();

    const res = await fetch(RESPONSES_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type":  "application/json",
      },
      body: this.body(req, false),
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

  async executeStream(req: AIRequest): Promise<ReadableStream<string>> {
    const res = await fetch(RESPONSES_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type":  "application/json",
      },
      body: this.body(req, true),
    });

    if (!res.ok || !res.body) {
      const errText = await res.text().catch(() => "(no body)");
      throw new Error(`OpenAI ${res.status}: ${errText}`);
    }

    return res.body
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(sseToDeltaText());
  }
}

// Parses the OpenAI Responses SSE stream and emits only the text deltas.
function sseToDeltaText(): TransformStream<string, string> {
  let buffer = "";

  const drain = (enqueue: (chunk: string) => void) => {
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const evt of events) {
      for (const line of evt.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data) as { type?: string; delta?: string };
          if (parsed.type === "response.output_text.delta" && parsed.delta) {
            enqueue(parsed.delta);
          }
        } catch {
          // keep-alive comment or a frame split across chunks — ignore
        }
      }
    }
  };

  return new TransformStream<string, string>({
    transform(chunk, controller) {
      buffer += chunk;
      drain((c) => controller.enqueue(c));
    },
    flush(controller) {
      buffer += "\n\n";
      drain((c) => controller.enqueue(c));
    },
  });
}
