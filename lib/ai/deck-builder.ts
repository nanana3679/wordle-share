import { AI_MODEL, createAnthropicClient, extractJsonPayload, extractText } from "./client";
import { DeckDraftSchema, type DeckDraft, type TopicCandidate } from "@/scripts/ai/schemas";
import { processWords } from "@/lib/wordConstraints";
import { z } from "zod";

const RawDeckSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  words: z.array(z.string()).min(10),
});

export interface DeckBuilderInput {
  topic: TopicCandidate;
  runId: string;
  index: number;
  maxRetries?: number;
}

function buildSystemPrompt(): string {
  return [
    "You are building a themed word deck for a casual Wordle-style Korean sharing site.",
    "Decks are written by ordinary users, so the tone must feel natural — not like a bot or a museum label.",
    "",
    "Strict rules for the words array:",
    "- Between 12 and 20 distinct English words.",
    "- Each word contains ONLY a-z letters (no digits, no spaces, no apostrophes, no hyphens).",
    "- No duplicates (case-insensitive).",
    "- Each word must have a clear semantic link to the topic.",
    "- Prefer common, recognizable words over obscure jargon.",
    "",
    "Name/description rules:",
    "- Write in Korean unless the topic is inherently English-only.",
    "- Casual, conversational tone. Avoid overly formal phrasing ('~에 대한 단어들').",
    '- Good: "요즘 빠진 드라마 단어들", "이번 주 영화관에서 주워온 것들"',
    '- Bad:  "2026년 4월 주요 영화 작품 관련 단어 모음"',
    "- Description: 1-2 sentences, also casual.",
    "",
    "Return ONLY a JSON object in a ```json fence, nothing else.",
  ].join("\n");
}

function buildUserPrompt(topic: TopicCandidate): string {
  return [
    `Topic: ${topic.topic}`,
    `Context: ${topic.description}`,
    topic.rationale ? `Why it's hot: ${topic.rationale}` : "",
    "",
    "Produce one deck following this exact JSON shape:",
    "```json",
    "{",
    '  "name": "...",',
    '  "description": "...",',
    '  "words": ["alpha", "bravo", ...]',
    "}",
    "```",
  ]
    .filter(Boolean)
    .join("\n");
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

    const stream = client.messages.stream({
      model: AI_MODEL,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      system: buildSystemPrompt(),
      messages: [{ role: "user", content: userPrompt }],
    });

    const finalMessage = await stream.finalMessage();
    const text = extractText(finalMessage.content);

    try {
      const payload = extractJsonPayload(text);
      const raw = RawDeckSchema.parse(payload);
      const { normalizedWords, validation } = processWords(raw.words);

      if (!validation.isValid) {
        lastError = validation.errors.join("; ");
        continue;
      }

      const draft = {
        id: `${input.runId}-d${input.index + 1}`,
        topicId: input.topic.id,
        topic: input.topic.topic,
        name: raw.name.trim(),
        description: raw.description.trim(),
        words: normalizedWords,
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
