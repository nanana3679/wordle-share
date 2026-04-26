import type { Deck } from "@/types/decks";

export const getWordStrings = (deck: Pick<Deck, "words">): string[] =>
  (deck.words ?? []).map((w) => w.word);
