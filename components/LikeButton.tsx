"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleLike } from "@/app/actions/like";
import type { FeedPage } from "@/app/actions/feed";
import {
  initialLikeState,
  applyClick,
  applyRollback,
  clearPendingChange,
  pendingServerDesired,
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

interface LikeMutationInput {
  liked: boolean;
  previousLiked: boolean;
  requestId: number;
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
  const serverTargetRef = useRef(initialLiked);
  const requestIdRef = useRef(0);
  const displayCount = othersLikeCountBaseline + (state.liked ? 1 : 0);

  const syncFeedCache = useCallback((liked: boolean) => {
    queryClient.setQueriesData<InfiniteData<FeedPage>>(
      { queryKey: ["feed"] },
      (data) => (data ? updateDeckLikeInFeedData(data, deckId, { liked }) : data),
    );
  }, [deckId, queryClient]);

  const likeMutation = useMutation({
    mutationFn: async ({ liked }: LikeMutationInput) => {
      const result = await toggleLike(deckId, liked);
      if (!result.success) {
        throw new Error(result.message);
      }
    },
    retry: 3,
    onSuccess: (_data, variables) => {
      if (variables.requestId !== requestIdRef.current) return;
      setState((prev) => (prev.liked === variables.liked ? clearPendingChange(prev) : prev));
    },
    onError: (error, variables) => {
      if (variables.requestId !== requestIdRef.current) return;
      serverTargetRef.current = variables.previousLiked;
      if (stateRef.current.liked !== variables.liked) return;
      setState((prev) => {
        const next = applyRollback(prev);
        syncFeedCache(next.liked);
        return next;
      });
      toast.error(error instanceof Error ? error.message : t('networkError'));
    },
  });

  const flush = () => {
    const desired = pendingServerDesired(stateRef.current, serverTargetRef.current);
    if (desired === null) {
      // 연타로 원위치 — 전송 생략, snapshot만 해제
      setState((prev) => clearPendingChange(prev));
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const previousLiked = serverTargetRef.current;
    serverTargetRef.current = desired;
    likeMutation.mutate({ liked: desired, previousLiked, requestId });
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
      serverTargetRef.current = initialLiked;
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
