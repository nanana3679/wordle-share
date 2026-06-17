"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleLike, type LikeActionResponse } from "@/app/actions/like";
import type { FeedPage } from "@/app/actions/feed";
import {
  initialLikeState,
  applyClick,
  applyServerLiked,
  applyRollback,
  clearPendingChange,
  pendingDesired,
  LIKE_DEBOUNCE_MS,
  type LikeState,
} from "@/lib/optimistic-like";
import { updateDeckLikeInFeedData } from "@/lib/feed-query";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  deckId: string;
  initialCount: number;
  initialLiked: boolean;
}

export function LikeButton({ deckId, initialCount, initialLiked }: LikeButtonProps) {
  const t = useTranslations('common');
  const queryClient = useQueryClient();
  const [state, setState] = useState<LikeState>(() => initialLikeState(initialLiked, initialCount));
  const othersLikeCountBaseline = useMemo(
    () => Math.max(0, initialCount - (initialLiked ? 1 : 0)),
    [initialCount, initialLiked],
  );
  const stateRef = useRef(state);
  stateRef.current = state;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayCount = othersLikeCountBaseline + (state.liked ? 1 : 0);

  const syncFeedCache = useCallback((liked: boolean) => {
    queryClient.setQueriesData<InfiniteData<FeedPage>>(
      { queryKey: ["feed"] },
      (data) => (data ? updateDeckLikeInFeedData(data, deckId, { liked }) : data),
    );
  }, [deckId, queryClient]);

  const flush = async () => {
    const desired = pendingDesired(stateRef.current);
    if (desired === null) {
      // 연타로 원위치 — 전송 생략, snapshot만 해제
      setState((prev) => clearPendingChange(prev));
      return;
    }

    const send = (): Promise<LikeActionResponse> => toggleLike(deckId, desired);
    let result = await send().catch(() => null);
    if (!result) result = await send().catch(() => null); // 네트워크 실패 1회 재시도 (AC)

    if (result?.success && result.data) {
      setState((prev) => applyServerLiked(prev, result.data!.liked));
      syncFeedCache(result.data.liked);
    } else {
      setState((prev) => {
        const next = applyRollback(prev);
        syncFeedCache(next.liked);
        return next;
      });
      toast.error(result?.message ?? t('networkError'));
    }
  };

  const handleClick = () => {
    setState((prev) => {
      const next = applyClick(prev); // 즉시 반영 (AC)
      syncFeedCache(next.liked);
      return next;
    });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void flush(), LIKE_DEBOUNCE_MS); // 200ms debounce (AC)
  };

  useEffect(() => {
    setState((prev) => {
      if (prev.snapshot) return prev;
      return initialLikeState(initialLiked, initialCount);
    });
  }, [initialLiked, initialCount]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <Button type="button" variant="outline" onClick={handleClick} aria-pressed={state.liked}>
      <Heart className={cn("size-4", state.liked && "fill-red-500 text-red-500")} />
      {displayCount}
    </Button>
  );
}
