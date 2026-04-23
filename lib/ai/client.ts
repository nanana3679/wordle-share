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
