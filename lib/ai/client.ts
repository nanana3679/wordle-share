import Anthropic from "@anthropic-ai/sdk";

export const AI_MODEL = "claude-sonnet-4-6";

export function createAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local or your shell environment.",
    );
  }
  return new Anthropic({ apiKey });
}

export function extractText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

export function extractJsonPayload(text: string): unknown {
  const fences = Array.from(text.matchAll(/```(json)?\s*([\s\S]*?)```/g));
  const jsonFences = fences.filter((m) => m[1] === "json");
  const chosenFence = jsonFences.at(-1) ?? fences.at(-1);
  const candidate = chosenFence ? chosenFence[2] : text;
  const slice = extractBalancedObject(candidate);
  if (!slice) {
    throw new Error(`Model response did not contain a JSON object:\n${text}`);
  }
  try {
    return JSON.parse(slice);
  } catch (err) {
    throw new Error(
      `Failed to parse JSON from model response: ${(err as Error).message}\n---\n${slice}`,
    );
  }
}

export interface AITrace {
  model: string;
  stopReason: string | null;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadInputTokens?: number;
    cacheCreationInputTokens?: number;
  };
  thinking: string[];
  webSearches: Array<{ query: string; resultCount: number; topUrls: string[] }>;
  webFetches: Array<{ url: string; retrievedAt?: string; preview?: string }>;
  finalText: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function extractTrace(finalMessage: Anthropic.Message): AITrace {
  const thinking: string[] = [];
  const webSearches: AITrace["webSearches"] = [];
  const webFetches: AITrace["webFetches"] = [];
  const textParts: string[] = [];

  const blocks = finalMessage.content as unknown as Array<Record<string, unknown>>;
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const type = block.type as string;
    if (type === "thinking") {
      const t = typeof block.thinking === "string" ? block.thinking : "";
      if (t) thinking.push(t);
    } else if (type === "text") {
      const t = typeof block.text === "string" ? block.text : "";
      if (t) textParts.push(t);
    } else if (type === "server_tool_use") {
      const name = block.name as string;
      const input = asRecord(block.input) ?? {};
      const next = blocks[i + 1];
      const nextType = next?.type as string | undefined;
      if (name === "web_search" && nextType === "web_search_tool_result") {
        const results = Array.isArray(next.content) ? (next.content as Array<Record<string, unknown>>) : [];
        webSearches.push({
          query: typeof input.query === "string" ? input.query : JSON.stringify(input),
          resultCount: results.length,
          topUrls: results.slice(0, 5).map((r) => (typeof r.url === "string" ? r.url : "")).filter(Boolean),
        });
      } else if (name === "web_fetch" && nextType === "web_fetch_tool_result") {
        const content = asRecord(next.content);
        const url = typeof content?.url === "string" ? content.url : typeof input.url === "string" ? input.url : "";
        const retrievedAt = typeof content?.retrieved_at === "string" ? content.retrieved_at : undefined;
        const sourceRecord = asRecord(content?.content);
        const dataRecord = asRecord(sourceRecord?.source);
        const data = typeof dataRecord?.data === "string" ? dataRecord.data : undefined;
        webFetches.push({
          url,
          retrievedAt,
          preview: data ? data.slice(0, 200) : undefined,
        });
      }
    }
  }

  return {
    model: finalMessage.model,
    stopReason: finalMessage.stop_reason ?? null,
    usage: {
      inputTokens: finalMessage.usage.input_tokens,
      outputTokens: finalMessage.usage.output_tokens,
      cacheReadInputTokens: finalMessage.usage.cache_read_input_tokens ?? undefined,
      cacheCreationInputTokens: finalMessage.usage.cache_creation_input_tokens ?? undefined,
    },
    thinking,
    webSearches,
    webFetches,
    finalText: textParts.join("\n").trim(),
  };
}

function extractBalancedObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}
