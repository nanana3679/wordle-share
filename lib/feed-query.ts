import type { InfiniteData, QueryClient, QueryKey } from "@tanstack/react-query";
import type { FeedPage, FeedSort } from "@/app/actions/feed";

export type FeedQuerySnapshot = Array<[QueryKey, InfiniteData<FeedPage> | undefined]>;

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
  like: { liked: boolean; count: number },
): InfiniteData<FeedPage> {
  return {
    pageParams: data.pageParams,
    pages: data.pages.map((page) => ({
      ...page,
      decks: page.decks.map((deck) =>
        deck.id === deckId
          ? { ...deck, likedByMe: like.liked, like_count: like.count }
          : deck,
      ),
    })),
  };
}

export function applyOptimisticDeckLikeInFeedData(
  data: InfiniteData<FeedPage>,
  deckId: string,
  liked: boolean,
): InfiniteData<FeedPage> {
  return {
    pageParams: data.pageParams,
    pages: data.pages.map((page) => ({
      ...page,
      decks: page.decks.map((deck) => {
        if (deck.id !== deckId) return deck;
        const delta = deck.likedByMe === liked ? 0 : liked ? 1 : -1;
        return { ...deck, likedByMe: liked, like_count: deck.like_count + delta };
      }),
    })),
  };
}

export function snapshotFeedQueries(queryClient: QueryClient): FeedQuerySnapshot {
  return queryClient.getQueriesData<InfiniteData<FeedPage>>({ queryKey: ["feed"] });
}

export function restoreFeedQueries(queryClient: QueryClient, snapshot: FeedQuerySnapshot) {
  snapshot.forEach(([queryKey, data]) => {
    queryClient.setQueryData(queryKey, data);
  });
}
