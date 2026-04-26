import { z } from "zod";

const AiDeckSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  categories: z.array(z.string()).default([]),
  words: z
    .array(
      z.object({
        word: z.string(),
        tags: z.array(z.string()).default([]),
      })
    )
    .default([]),
});

export type ParsedAiDeck = {
  name?: string;
  description?: string;
  categories: string[];
  words: { word: string; tags: string[] }[];
  droppedWords: string[];
};

export type ParseAiDeckResult =
  | { ok: true; data: ParsedAiDeck }
  | { ok: false; error: string };

const CODE_BLOCK_RE = /```(?:json)?\s*([\s\S]*?)```/i;

function extractJsonCandidate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const codeBlockMatch = trimmed.match(CODE_BLOCK_RE);
  if (codeBlockMatch) {
    const inner = codeBlockMatch[1].trim();
    if (inner) return inner;
  }

  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    return trimmed.slice(first, last + 1);
  }
  return null;
}

export function parseAiDeckResponse(raw: string): ParseAiDeckResult {
  const candidate = extractJsonCandidate(raw);
  if (!candidate) {
    return { ok: false, error: "JSON 형식이 아닙니다" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return { ok: false, error: "JSON 형식이 아닙니다" };
  }

  const validation = AiDeckSchema.safeParse(parsed);
  if (!validation.success) {
    return { ok: false, error: "JSON 스키마가 올바르지 않습니다" };
  }
  const v = validation.data;

  const categories = Array.from(
    new Set(
      v.categories
        .map((c) => c.trim())
        .filter((c) => c.length > 0)
    )
  );

  const droppedWords: string[] = [];
  const words: { word: string; tags: string[] }[] = [];

  for (const incoming of v.words) {
    const normalized = incoming.word.trim().toLowerCase();
    if (!normalized) continue;
    if (!/^[a-z]+$/.test(normalized)) {
      droppedWords.push(incoming.word);
      continue;
    }
    const tags = Array.from(
      new Set(
        incoming.tags
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t.length > 0)
      )
    );
    words.push({ word: normalized, tags });
  }

  if (words.length === 0) {
    return { ok: false, error: "유효한 단어를 찾지 못했습니다" };
  }

  // tags에 등장했지만 categories에 없는 값을 자동 추가 (LLM이 빠뜨린 경우 보정)
  const categorySet = new Set(categories);
  for (const w of words) {
    for (const t of w.tags) {
      if (!categorySet.has(t)) {
        categorySet.add(t);
        categories.push(t);
      }
    }
  }

  const data: ParsedAiDeck = {
    name: v.name?.trim() || undefined,
    description: v.description?.trim() || undefined,
    categories,
    words,
    droppedWords,
  };

  return { ok: true, data };
}
