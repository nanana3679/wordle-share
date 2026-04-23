import { AI_MODEL, createAnthropicClient, extractJsonPayload, extractText } from "./client";
import {
  DeckDraftSchema,
  type DeckDraft,
  type DeckWord,
  type TopicCandidate,
} from "@/scripts/ai/schemas";
import { processWords } from "@/lib/wordConstraints";
import { z } from "zod";

const RawWordSchema = z.object({
  word: z.string().min(1),
  tags: z.array(z.string()).default([]),
});

const RawDeckSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  words: z.array(RawWordSchema).min(1),
});

export interface DeckBuilderInput {
  topic: TopicCandidate;
  runId: string;
  index: number;
  maxRetries?: number;
}

function buildSystemPrompt(): string {
  return [
    "You are building a themed word deck for a Wordle-style Korean sharing site.",
    "Decks are written by ordinary users, so the tone must feel natural — not like a bot or a museum label.",
    "",
    "Use the web_search and web_fetch tools to ground yourself in CURRENT, REAL data.",
    "- For franchises with canonical rosters (Pokemon, VTuber agencies, K-pop groups, anime), fetch the official roster page or a reliable wiki before composing words.",
    "- NEVER invent names from memory. If the web search can't confirm it, don't include it.",
    "- For localized franchises (Pokemon, game characters, anime), use the GLOBAL / ORIGINAL OFFICIAL ROMANIZATION, not the Korean-localized spelling. Examples: 'pikachu' (not 'piccachu'), 'charizard' (not 'lizardon'), 'bulbasaur'. When in doubt, prefer the spelling on the official English website or Wikipedia.",
    "- Historical / graduated / retired members count as canonical. Do NOT exclude them just because they're no longer active. A BTS deck includes all 7 members forever; a hololive deck includes graduated members.",
    "",
    "Strict rules for the words array:",
    "- Use ONLY a-z letters in each word (no digits, spaces, apostrophes, hyphens, accents).",
    "- No duplicates (case-insensitive).",
    "- NO SIZE LIMIT. Cover the full canonical set of elements for the topic.",
    "  - Small topics (7 BTS members): 7 is fine.",
    "  - Large topics (Pokemon, all hololive members): 50-150+ is fine. Err on the side of completeness.",
    "- SEMANTIC COMPLETENESS > length. 2-letter iconic words (rm, iu, ai, ame, ina) and very long names (shirakami, seventeen) must be included if they're essential.",
    "- English words AND romanized proper nouns from any language are both fine.",
    "",
    "EVERY word must have tags. Tags are the game's difficulty knob — players will filter by tag before starting.",
    "- Tag values: lowercase, hyphenated if multi-word (e.g. 'gen1', 'electric-type', 'graduated', 'en-branch', 'girl-group', '4th-gen', 'debut-2018').",
    "- Use 2-5 tags per word. Mix broad (era/group/generation) and specific (attribute/role/sub-unit).",
    "- Tag taxonomy should be consistent within one deck so players can meaningfully filter.",
    "- Example for Pokemon: 'pikachu' → ['gen1', 'electric', 'mascot', 'anime-main']. For VTuber: 'pekora' → ['hololive', 'jp-branch', 'gen3', 'active'].",
    "",
    "Name/description rules:",
    "- Write in Korean unless the topic is inherently English-only.",
    "- Casual, conversational tone. Avoid overly formal phrasing.",
    '- Good: "홀로라이브 팬이면 다 아는 이름들", "이번 주 빠진 드라마 단어들"',
    '- Bad:  "2026년 홀로라이브 프로덕션 소속 탤런트 명칭 모음"',
    "",
    "Return ONLY a JSON object in a ```json fence, nothing else outside the fence.",
  ].join("\n");
}

function buildUserPrompt(topic: TopicCandidate): string {
  return [
    `Topic: ${topic.topic}`,
    `Context: ${topic.description}`,
    topic.rationale ? `Why it's hot: ${topic.rationale}` : "",
    "",
    "Step 1: Use web_search / web_fetch to find the authoritative source for the canonical roster or element set of this topic.",
    "Step 2: Based on verified data, compose the deck.",
    "",
    "Produce one deck following this exact JSON shape:",
    "```json",
    "{",
    '  "name": "...",',
    '  "description": "...",',
    '  "words": [',
    '    { "word": "pikachu", "tags": ["gen1", "electric", "mascot"] },',
    '    { "word": "charizard", "tags": ["gen1", "fire", "starter-evolution"] }',
    "  ]",
    "}",
    "```",
  ]
    .filter(Boolean)
    .join("\n");
}

function normalizeTaggedWords(raw: z.infer<typeof RawDeckSchema>["words"]): {
  words: DeckWord[];
  rejected: string[];
} {
  const seen = new Map<string, string[]>();
  const rejected: string[] = [];

  for (const { word, tags } of raw) {
    const normalized = word.trim().toLowerCase();
    if (!normalized) continue;
    // Drop tokens with non-a-z chars (hyphens, apostrophes, digits, spaces) per-word
    // rather than failing the whole attempt. Rejected originals are logged for the reviewer.
    if (!/^[a-z]+$/.test(normalized)) {
      rejected.push(word);
      continue;
    }
    if (!seen.has(normalized)) {
      const uniqueTags = Array.from(
        new Set((tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean)),
      );
      seen.set(normalized, uniqueTags);
    }
  }

  // Sanity check via shared validator — should always pass since we pre-filtered.
  const flatWords = Array.from(seen.keys());
  processWords(flatWords);

  const words: DeckWord[] = Array.from(seen.entries()).map(([word, tags]) => ({
    word,
    tags,
  }));

  return { words, rejected };
}

export async function buildDeck(input: DeckBuilderInput): Promise<DeckDraft> {
  const client = createAnthropicClient();
  const maxRetries = input.maxRetries ?? 3;
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const userPrompt =
      attempt === 1
        ? buildUserPrompt(input.topic)
        : `${buildUserPrompt(input.topic)}\n\nPrevious attempt failed validation: ${lastError}\nFix the issues and try again.`;

    try {
      const stream = client.messages.stream({
        model: AI_MODEL,
        max_tokens: 16000,
        thinking: { type: "adaptive" },
        system: buildSystemPrompt(),
        messages: [{ role: "user", content: userPrompt }],
        tools: [
          { type: "web_search_20260209", name: "web_search" },
          { type: "web_fetch_20260209", name: "web_fetch" },
        ],
      });

      const finalMessage = await stream.finalMessage();
      const text = extractText(finalMessage.content);

      const payload = extractJsonPayload(text);
      const raw = RawDeckSchema.parse(payload);
      const { words, rejected } = normalizeTaggedWords(raw.words);

      if (rejected.length > 0) {
        console.warn(
          `[deck-builder] topic="${input.topic.topic}" dropped ${rejected.length} invalid token(s): ${rejected.join(", ")}`,
        );
      }

      if (words.length === 0) {
        lastError = "No valid words after normalization";
        continue;
      }

      const draft = {
        id: `${input.runId}-d${input.index + 1}`,
        topicId: input.topic.id,
        topic: input.topic.topic,
        name: raw.name.trim(),
        description: raw.description.trim(),
        language: "en" as const,
        words,
        authorHandle: "TBD",
        status: "pending" as const,
      };

      return DeckDraftSchema.parse(draft);
    } catch (err) {
      lastError = (err as Error).message;
    }
  }

  throw new Error(
    `Deck generation for topic "${input.topic.topic}" failed after ${maxRetries} attempts. Last error: ${lastError}`,
  );
}
