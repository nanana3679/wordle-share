import { z } from "zod";

export const ReviewStatus = z.enum(["pending", "approved", "rejected"]);

export const TopicSourceSchema = z.object({
  url: z.url(),
  title: z.string().optional(),
  publishedAt: z.string().optional(),
});

export const TopicCandidateSchema = z.object({
  id: z.string(),
  topic: z.string().min(1),
  description: z.string().min(1),
  rationale: z.string().optional(),
  fandomSignals: z.array(z.string()).default([]),
  sources: z.array(TopicSourceSchema).default([]),
  status: ReviewStatus.default("pending"),
  reviewNote: z.string().optional(),
});

export const TopicsArtifactSchema = z.object({
  runId: z.string(),
  generatedAt: z.string(),
  category: z.string(),
  model: z.string(),
  candidates: z.array(TopicCandidateSchema).min(1),
});

export const DeckWordSchema = z.object({
  word: z.string().regex(/^[a-zA-Z]+$/),
  tags: z.array(z.string().min(1)).default([]),
});

// Language of the deck's WORDS (what the Wordle game uses), not of name/description.
// Current pipeline only produces "en" (a-z). "ko"/"ja" reserved for future 꼬들/히라가나 modes.
export const DeckLanguageSchema = z.enum(["en", "ko", "ja"]);

export const DeckDraftSchema = z.object({
  id: z.string(),
  topicId: z.string(),
  topic: z.string(),
  name: z.string().min(1),
  description: z.string().min(1),
  language: DeckLanguageSchema.default("en"),
  words: z.array(DeckWordSchema).min(1),
  authorHandle: z.string().default("TBD"),
  status: ReviewStatus.default("pending"),
  reviewNote: z.string().optional(),
});

export const DecksArtifactSchema = z.object({
  runId: z.string(),
  generatedAt: z.string(),
  model: z.string(),
  sourceTopicsRunId: z.string(),
  drafts: z.array(DeckDraftSchema).min(1),
});

export type TopicCandidate = z.infer<typeof TopicCandidateSchema>;
export type TopicsArtifact = z.infer<typeof TopicsArtifactSchema>;
export type DeckWord = z.infer<typeof DeckWordSchema>;
export type DeckLanguage = z.infer<typeof DeckLanguageSchema>;
export type DeckDraft = z.infer<typeof DeckDraftSchema>;
export type DecksArtifact = z.infer<typeof DecksArtifactSchema>;

export const TOPIC_CATEGORIES = [
  "kpop",
  "vtuber",
  "anime-manga",
  "videogames",
  "mobile-gacha",
  "film-tv",
  "sports",
  "character-brands",
  "tabletop-rpg",
  "mythology-history",
] as const;

export type TopicCategory = (typeof TOPIC_CATEGORIES)[number];
