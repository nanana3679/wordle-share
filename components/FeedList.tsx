"use client";

import { useCallback, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { FeedDeckCard } from "@/components/FeedDeckCard";
import { EmptyResult } from "@/components/EmptyResult";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { getFeed, searchDecks, type FeedDeck, type FeedSort } from "@/app/actions/feed";
import { feedQueryKey, mergeFeedPages } from "@/lib/feed-query";

interface FeedListProps {
  /** 서버에서 렌더한 첫 페이지 */
  initialDecks: FeedDeck[];
  initialNextOffset: number | null;
  sort: FeedSort;
  /** 검색 모드 — 지정 시 searchDecks로 추가 로드 */
  query?: string;
}

export function FeedList({ initialDecks, initialNextOffset, sort, query }: FeedListProps) {
  const t = useTranslations("deck.list");
  const initialPage = useMemo(
    () => ({ decks: initialDecks, nextOffset: initialNextOffset }),
    [initialDecks, initialNextOffset],
  );
  const feedQuery = useInfiniteQuery({
    queryKey: feedQueryKey({ sort, query }),
    queryFn: async ({ pageParam }) => {
      const result =
        query !== undefined
          ? await searchDecks({ q: query, offset: pageParam })
          : await getFeed({ sort, offset: pageParam });
      if (!result.success || !result.data) {
        throw new Error(result.message);
      }
      return result.data;
    },
    initialData: {
      pages: [initialPage],
      pageParams: [0],
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
  });

  const page = useMemo(
    () => mergeFeedPages(feedQuery.data?.pages ?? [initialPage]),
    [feedQuery.data?.pages, initialPage],
  );

  const loadMore = useCallback(async () => {
    if (!feedQuery.hasNextPage || feedQuery.isFetchingNextPage) return;
    await feedQuery.fetchNextPage();
  }, [feedQuery]);

  const sentinelRef = useIntersectionObserver(loadMore);

  if (page.decks.length === 0) return <EmptyResult query={query} />;

  return (
    <div className="space-y-3">
      {page.decks.map((deck) => (
        <FeedDeckCard key={deck.id} deck={deck} />
      ))}
      {page.nextOffset !== null && (
        <div ref={sentinelRef} className="py-4 text-center text-sm text-muted-foreground">
          {t("loading")}
        </div>
      )}
    </div>
  );
}
