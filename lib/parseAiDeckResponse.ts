import { z } from "zod";

export type AiErrorTranslator = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

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

// 카테고리/태그 슬러그 규칙: 영어 소문자 + 하이픈만, 최소 한 글자는 a-z.
// 위반 시 silently drop — 한글/공백/슬래시/숫자/하이픈만 등 비정형 입력 차단.
const SLUG_RE = /^[a-z-]+$/;
const HAS_LETTER_RE = /[a-z]/;
function isValidSlug(s: string): boolean {
  return SLUG_RE.test(s) && HAS_LETTER_RE.test(s);
}

/**
 * Try, in order:
 *   1. ```json ... ``` code block (preferred — most LLMs wrap with this).
 *   2. Direct JSON.parse on trimmed input (clean JSON-only response).
 *   3. Slice from first `{` to last `}` — last resort for prose-prefixed JSON
 *      like "여기 결과입니다: { ... }". Code block path runs first so prose
 *      that contains both inline `{}` snippets AND a code block won't reach
 *      this branch.
 */
function tryParseJson(raw: string): { ok: true; value: unknown } | { ok: false } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false };

  const codeBlockMatch = trimmed.match(CODE_BLOCK_RE);
  if (codeBlockMatch) {
    const inner = codeBlockMatch[1].trim();
    if (inner) {
      try {
        return { ok: true, value: JSON.parse(inner) };
      } catch {
        // fall through
      }
    }
  }

  try {
    return { ok: true, value: JSON.parse(trimmed) };
  } catch {
    // fall through
  }

  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last > first) {
    try {
      return { ok: true, value: JSON.parse(trimmed.slice(first, last + 1)) };
    } catch {
      // give up
    }
  }

  return { ok: false };
}

export function parseAiDeckResponse(
  raw: string,
  t: AiErrorTranslator,
): ParseAiDeckResult {
  const parsed = tryParseJson(raw);
  if (!parsed.ok) {
    return { ok: false, error: t("jsonParseFailed") };
  }

  const validation = AiDeckSchema.safeParse(parsed.value);
  if (!validation.success) {
    return { ok: false, error: t("schemaInvalid") };
  }
  const v = validation.data;

  // categories: trim + lowercase + slug 검증 + dedupe (첫 등장 순서 유지)
  const seenCategory = new Set<string>();
  const categories: string[] = [];
  for (const raw of v.categories) {
    const norm = raw.trim().toLowerCase();
    if (!norm) continue;
    if (!isValidSlug(norm)) continue;
    if (seenCategory.has(norm)) continue;
    seenCategory.add(norm);
    categories.push(norm);
  }

  // words: 정규화 + a-z 검증 + 중복 단어 머지 (tags 합집합)
  const droppedWords: string[] = [];
  const wordIndex = new Map<string, number>();
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
          .filter((t) => t.length > 0 && isValidSlug(t))
      )
    );

    const existingIdx = wordIndex.get(normalized);
    if (existingIdx !== undefined) {
      const existing = words[existingIdx];
      words[existingIdx] = {
        word: existing.word,
        tags: Array.from(new Set([...existing.tags, ...tags])),
      };
    } else {
      wordIndex.set(normalized, words.length);
      words.push({ word: normalized, tags });
    }
  }

  if (words.length === 0) {
    return { ok: false, error: t("noValidWords") };
  }

  // tags에 등장했지만 categories에 없는 값을 보정 추가 (LLM이 빠뜨린 경우)
  // 불변성 유지를 위해 새 배열 생성
  const finalCategories = [...categories];
  const finalCategorySet = new Set(finalCategories);
  for (const w of words) {
    for (const t of w.tags) {
      if (!finalCategorySet.has(t)) {
        finalCategorySet.add(t);
        finalCategories.push(t);
      }
    }
  }

  return {
    ok: true,
    data: {
      name: v.name?.trim() || undefined,
      description: v.description?.trim() || undefined,
      categories: finalCategories,
      words,
      droppedWords,
    },
  };
}
