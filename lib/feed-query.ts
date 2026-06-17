import type { InfiniteData } from "@tanstack/react-query";
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

export function updateDeckLikeInFeedData(
  data: InfiniteData<FeedPage>,
  deckId: string,
  like: { liked: boolean },
): InfiniteData<FeedPage> {
  return {
    pageParams: data.pageParams,
    pages: data.pages.map((page) => ({
      ...page,
      decks: page.decks.map((deck) => {
        if (deck.id !== deckId) return deck;
        const othersLikeCountBaseline = deck.like_count - (deck.likedByMe ? 1 : 0);
        return {
          ...deck,
          likedByMe: like.liked,
          like_count: othersLikeCountBaseline + (like.liked ? 1 : 0),
        };
      }),
    })),
  };
}
