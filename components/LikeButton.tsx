"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getLikeStatus, toggleLike } from "@/app/actions/like";
import type { FeedPage } from "@/app/actions/feed";
import {
  initialLikeState,
  applyClick,
  applyServerLiked,
  clearPendingChange,
  canSyncInitialLikeState,
  getLikeFlushDecision,
  pendingLatestDesired,
  LIKE_DEBOUNCE_MS,
  type LikeState,
} from "@/lib/optimistic-like";
import { updateDeckLikeInFeedData } from "@/lib/feed-query";
import { cn } from "@/lib/utils";

const LIKE_ACK_TIMEOUT_MS = 5000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error("좋아요 응답 시간이 초과되었습니다.")),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDesiredRef = useRef(initialLiked);
  const serverKnownRef = useRef(initialLiked);
  const inFlightRef = useRef<LikeMutationInput | null>(null);
  const flushRef = useRef<() => void>(() => {});
  const requestIdRef = useRef(0);
  const displayCount = othersLikeCountBaseline + (state.liked ? 1 : 0);

  const syncFeedCache = useCallback((liked: boolean) => {
    queryClient.setQueriesData<InfiniteData<FeedPage>>(
      { queryKey: ["feed"] },
      (data) => (data ? updateDeckLikeInFeedData(data, deckId, { liked }) : data),
    );
  }, [deckId, queryClient]);

  const reconcileLikeStatus = useCallback(async (options?: { adoptServerTruth?: boolean }) => {
    const expectedDesired = latestDesiredRef.current;
    try {
      const result = await withTimeout(getLikeStatus(deckId), LIKE_ACK_TIMEOUT_MS);
      if (!result.success || !result.data) return;
      if (latestDesiredRef.current !== expectedDesired) return;

      const reconciledLiked = result.data.liked;
      serverKnownRef.current = reconciledLiked;
      if (options?.adoptServerTruth || latestDesiredRef.current === reconciledLiked) {
        latestDesiredRef.current = reconciledLiked;
        setState((prev) => {
          const next = applyServerLiked(prev, reconciledLiked);
          syncFeedCache(next.liked);
          return next;
        });
        return;
      }

      if (!debounceRef.current && !inFlightRef.current) {
        setTimeout(() => flushRef.current(), 0);
      }
    } catch {
      // Best-effort reconcile: the next navigation or query refetch can repair drift.
    }
  }, [deckId, syncFeedCache]);

  const likeMutation = useMutation({
    mutationFn: async ({ liked }: LikeMutationInput) => {
      const result = await withTimeout(toggleLike(deckId, liked), LIKE_ACK_TIMEOUT_MS);
      if (!result.success) {
        throw new Error(result.message);
      }
      return result.data?.liked ?? liked;
    },
    retry: 3,
    onSuccess: (serverLiked, variables) => {
      if (variables.requestId !== inFlightRef.current?.requestId) return;
      serverKnownRef.current = serverLiked;
      setState((prev) => (
        latestDesiredRef.current === serverKnownRef.current
          ? clearPendingChange(prev)
          : prev
      ));
    },
    onError: (error, variables) => {
      if (variables.requestId !== inFlightRef.current?.requestId) return;
      serverKnownRef.current = variables.previousLiked;
      if (latestDesiredRef.current !== variables.liked) {
        void reconcileLikeStatus();
        return;
      }
      latestDesiredRef.current = variables.previousLiked;
      setState((prev) => {
        const next = applyServerLiked(prev, variables.previousLiked);
        syncFeedCache(next.liked);
        return next;
      });
      toast.error(error instanceof Error ? error.message : t('networkError'));
      void reconcileLikeStatus({ adoptServerTruth: true });
    },
    onSettled: (_data, _error, variables) => {
      if (variables.requestId !== inFlightRef.current?.requestId) return;
      inFlightRef.current = null;
      if (
        !debounceRef.current &&
        pendingLatestDesired(latestDesiredRef.current, serverKnownRef.current, false) !== null
      ) {
        setTimeout(() => flushRef.current(), 0);
      }
    },
  });

  const flush = useCallback(() => {
    const decision = getLikeFlushDecision(
      latestDesiredRef.current,
      serverKnownRef.current,
      inFlightRef.current !== null,
    );
    if (decision.type === "defer") return;
    if (decision.type === "clear") {
      // 연타로 원위치 — 전송 생략, snapshot만 해제
      setState((prev) => clearPendingChange(prev));
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const desired = decision.liked;
    const variables = { liked: desired, previousLiked: serverKnownRef.current, requestId };
    inFlightRef.current = variables;
    likeMutation.mutate(variables);
  }, [likeMutation]);

  flushRef.current = flush;

  const handleClick = () => {
    setState((prev) => {
      const next = applyClick(prev); // 즉시 반영 (AC)
      latestDesiredRef.current = next.liked;
      syncFeedCache(next.liked);
      return next;
    });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      flushRef.current();
    }, LIKE_DEBOUNCE_MS); // 200ms debounce (AC)
  };

  useEffect(() => {
    setState((prev) => {
      if (
        !canSyncInitialLikeState(
          prev,
          latestDesiredRef.current,
          serverKnownRef.current,
          inFlightRef.current !== null,
        )
      ) {
        return prev;
      }
      latestDesiredRef.current = initialLiked;
      serverKnownRef.current = initialLiked;
      return initialLikeState(initialLiked, initialCount);
    });
  }, [initialLiked, initialCount]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = null;
    };
  }, []);

  return (
    <Button type="button" variant="outline" onClick={handleClick} aria-pressed={state.liked}>
      <Heart className={cn("size-4", state.liked && "fill-red-500 text-red-500")} />
      {displayCount}
    </Button>
  );
}
