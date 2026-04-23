import { AI_MODEL, createAnthropicClient, extractJsonPayload, extractText } from "./client";
import { TopicCandidateSchema, type TopicCandidate, type TopicCategory } from "@/scripts/ai/schemas";
import { z } from "zod";

const CATEGORY_BRIEFS: Record<TopicCategory, { sources: string; focus: string }> = {
  "global-trends": {
    sources: "Google Trends, X/Twitter trending, Reddit r/popular, r/all",
    focus: "globally viral topics from the last 3-7 days",
  },
  "korean-community": {
    sources: "더쿠(theqoo), DCInside, 나무위키 최근 변경, 네이트 판",
    focus: "한국 커뮤니티에서 최근 3-7일 사이 많이 회자된 이슈",
  },
  entertainment: {
    sources: "Variety, Deadline, Billboard, Soompi, Allkpop, 연합뉴스 연예",
    focus: "this week's most-discussed movies, TV, music, and K-pop",
  },
  news: {
    sources: "Reuters, AP News, 연합뉴스, BBC, NYT most-read",
    focus: "newsworthy but durable topics (not breaking politics) from the last week",
  },
  memes: {
    sources: "KnowYourMeme, Reddit r/memes, X quote-tweet spikes",
    focus: "memes or viral moments that are peaking right now",
  },
  sports: {
    sources: "ESPN, The Athletic, 스포츠조선, F1 news, match reports",
    focus: "biggest sports story or athlete of the week",
  },
  games: {
    sources: "IGN, Kotaku, Steam charts, Twitch top categories",
    focus: "game releases, patches, or esports moments trending this week",
  },
  food: {
    sources: "Bon Appetit, Eater, 네이버 푸드 트렌드, TikTok food tags",
    focus: "viral food trends, seasonal ingredients, or restaurant stories",
  },
  science: {
    sources: "Nature news, Ars Technica science, Quanta, 사이언스온",
    focus: "accessible science stories that caught public attention",
  },
  books: {
    sources: "NYT Bestsellers, 교보문고 베스트셀러, BookTok",
    focus: "books or authors people are talking about this week",
  },
};

export interface TopicSelectorInput {
  category: TopicCategory;
  candidateCount: number;
  recentTopics: string[];
  runId: string;
  now: Date;
}

const RawCandidateSchema = z.object({
  topic: z.string().min(1),
  description: z.string().min(1),
  rationale: z.string().optional(),
  viralitySignals: z.array(z.string()).optional(),
  sources: z
    .array(
      z.object({
        url: z.string(),
        title: z.string().optional(),
        publishedAt: z.string().optional(),
      }),
    )
    .optional(),
});

const RawResponseSchema = z.object({
  candidates: z.array(RawCandidateSchema).min(1),
});

function buildSystemPrompt(): string {
  return [
    "You are a topic curator for a Wordle-style word-deck sharing site.",
    "Your job: find timely, buzzy topics that would make fun themed word decks.",
    "",
    "Constraints on final topics:",
    "- Must be convertible into a reasonable set of roman-alphabet words (a-z only). There is NO size limit on the deck — small topics (7 members) or large topics (Pokemon, all hololive members) are both fine.",
    "- Word length is completely flexible — no minimum or maximum. Short (2-letter 'rm', 'iu') and long words are both fine.",
    "- Words can be English OR romanized proper nouns from any language (e.g. 'minji', 'tokyo', 'hatsune', 'kimchi', 'oppa', 'ramen'). For localized franchises (Pokemon, anime), note that the deck will use the GLOBAL / ORIGINAL official romanization, not Korean-localized names.",
    "- Prefer topics where the element set has a natural tag taxonomy (generation, era, sub-unit, type, role). Tags become the player's difficulty filter, so a topic with NO natural sub-categories is less valuable than one with many.",
    "- Historical / retired / graduated members count as canonical — a topic isn't invalid just because some elements are no longer active.",
    "- Prefer topics with strong recent virality signals (recent publishing dates, cross-source appearance, comment/share spikes).",
    "- Avoid politically divisive, tragic, or sensitive news topics.",
    "- Avoid topics that are niche to a single person's life; prefer broad cultural resonance.",
    "- Avoid duplicates or close paraphrases of the 'recently used topics' list provided.",
    "",
    "Use the web_search tool to find fresh sources. Cite 2-4 URLs per candidate that justify freshness/virality.",
    "Return ONLY a JSON object; no prose outside the JSON.",
  ].join("\n");
}

function buildUserPrompt(input: TopicSelectorInput): string {
  const brief = CATEGORY_BRIEFS[input.category];
  const recent = input.recentTopics.length
    ? input.recentTopics.map((t) => `- ${t}`).join("\n")
    : "(none yet)";

  return [
    `Today is ${input.now.toISOString().slice(0, 10)}.`,
    `Category for this run: ${input.category}`,
    `Suggested sources: ${brief.sources}`,
    `Focus: ${brief.focus}`,
    "",
    "Recently used topics to AVOID (last 4 weeks):",
    recent,
    "",
    `Produce ${input.candidateCount} topic candidates. For each candidate include:`,
    "- topic: short human-readable topic name (in the language most natural for the topic, Korean or English)",
    "- description: 1-2 sentences explaining what the deck's words would be about",
    "- rationale: why it fits this week (cite which source(s) show virality)",
    "- viralitySignals: 2-4 short bullet points of concrete signals",
    "- sources: array of { url, title, publishedAt } objects for 2-4 supporting sources",
    "",
    "Output exactly this JSON shape, wrapped in a ```json fence:",
    "```json",
    "{",
    '  "candidates": [',
    '    { "topic": "...", "description": "...", "rationale": "...", "viralitySignals": ["..."], "sources": [{ "url": "https://...", "title": "...", "publishedAt": "2026-04-18" }] }',
    "  ]",
    "}",
    "```",
  ].join("\n");
}

export async function selectTopics(
  input: TopicSelectorInput,
): Promise<TopicCandidate[]> {
  const client = createAnthropicClient();

  const stream = client.messages.stream({
    model: AI_MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: buildSystemPrompt(),
    messages: [{ role: "user", content: buildUserPrompt(input) }],
    tools: [
      { type: "web_search_20260209", name: "web_search" },
      { type: "web_fetch_20260209", name: "web_fetch" },
    ],
  });

  const finalMessage = await stream.finalMessage();
  const text = extractText(finalMessage.content);
  const payload = extractJsonPayload(text);
  const parsed = RawResponseSchema.parse(payload);

  return parsed.candidates.map((raw, index) => {
    const candidate = {
      id: `${input.runId}-c${index + 1}`,
      topic: raw.topic,
      description: raw.description,
      rationale: raw.rationale,
      viralitySignals: raw.viralitySignals ?? [],
      sources: (raw.sources ?? []).filter((s) => s.url.startsWith("http")),
      status: "pending" as const,
    };
    return TopicCandidateSchema.parse(candidate);
  });
}
