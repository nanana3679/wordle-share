import type { FeedPage, FeedSort } from "@/app/actions/feed";

export function feedQueryKey(input: { sort: FeedSort; query?: string }) {
  return ["feed", { sort: input.sort, query: input.query ?? null }] as const;
}

export function mergeFeedPages(pages: FeedPage[]): FeedPage {
  const seen = new Set<string>();
  const decks = pages.flatMap((page) =>
    page.decks.filter((deck) => {
      if (seen.has(deck.id)) return false;
      seen.add(deck.id);
      return true;
    }),
  );

  return {
    decks,
    nextOffset: pages.at(-1)?.nextOffset ?? null,
  };
}
