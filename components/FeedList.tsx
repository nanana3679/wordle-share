"use client";

import { useCallback, useRef, useState } from "react";
import { FeedDeckCard } from "@/components/FeedDeckCard";
import { EmptyResult } from "@/components/EmptyResult";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { getFeed, searchDecks, type FeedDeck, type FeedSort } from "@/app/actions/feed";

interface FeedListProps {
  /** 서버에서 렌더한 첫 페이지 */
  initialDecks: FeedDeck[];
  initialNextOffset: number | null;
  sort: FeedSort;
  /** 검색 모드 — 지정 시 searchDecks로 추가 로드 */
  query?: string;
}

export function FeedList({ initialDecks, initialNextOffset, sort, query }: FeedListProps) {
  const [decks, setDecks] = useState(initialDecks);
  const [nextOffset, setNextOffset] = useState(initialNextOffset);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || nextOffset === null) return;
    loadingRef.current = true;
    try {
      const result = query !== undefined
        ? await searchDecks({ q: query, offset: nextOffset })
        : await getFeed({ sort, offset: nextOffset });
      if (result.success && result.data) {
        const { decks: more, nextOffset: next } = result.data;
        setDecks((prev) => {
          const seen = new Set(prev.map((d) => d.id));
          return [...prev, ...more.filter((d) => !seen.has(d.id))];
        });
        setNextOffset(next);
      }
    } finally {
      loadingRef.current = false;
    }
  }, [nextOffset, sort, query]);

  const sentinelRef = useIntersectionObserver(loadMore);

  if (decks.length === 0) return <EmptyResult query={query} />;

  return (
    <div className="space-y-3">
      {decks.map((deck) => (
        <FeedDeckCard key={deck.id} deck={deck} />
      ))}
      {nextOffset !== null && (
        <div ref={sentinelRef} className="py-4 text-center text-sm text-muted-foreground">
          불러오는 중...
        </div>
      )}
    </div>
  );
}
