"use client";

import { useOptimistic, useState, useCallback, startTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { toggleLike } from "@/app/actions/like";
import { actionWithToast } from "@/lib/action-with-toast";
import { Deck } from "@/types/decks";

export function useOptimisticLike(deck: Deck) {
  const isLiked = deck.isLiked || false;
  const otherUsersLikeCount = (deck.likes?.length || 0) - (isLiked ? 1 : 0);
  const deckId = deck.id;

  const [isLikedState, setIsLikedState] = useState<boolean>(isLiked);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [optimisticIsLiked, applyOptimistic] = useOptimistic(
    isLikedState,
    (_current: boolean, next: boolean) => next
  );

  const handleToggleLike = useCallback(async () => {
    if (isLoading) return; // 이미 요청 중이면 재요청 방지 (낙관적 상태와 서버 상태가 꼬이는 상황 방지)
    const previousIsLiked = isLikedState; // 롤백을 위해 원본 값 캡처
    const next = !optimisticIsLiked;
    setIsLoading(true);

    startTransition(() => {
      applyOptimistic(next);
    });

    try {
      const response = await actionWithToast(
        () => toggleLike(deckId),
        { showToast: false }
      );

      if (!response.success) {
        startTransition(() => {
          setIsLikedState(previousIsLiked);
        });
        throw new Error(response.message);
      }

      // 서버에서 반환된 실제 상태로 확정
      const confirmedIsLiked = response.data?.isLiked ?? next;
      startTransition(() => {
        setIsLikedState(confirmedIsLiked);
      });
    } catch (error) {
      unstable_rethrow(error);
      startTransition(() => {
        setIsLikedState(previousIsLiked);
      });
      console.error("좋아요 처리 실패:", error);
      await actionWithToast(async () => ({
        success: false,
        message: error instanceof Error ? error.message : "좋아요 처리에 실패했습니다.",
      }));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, isLikedState, optimisticIsLiked, deckId]);

  const optimisticLikeCounts = otherUsersLikeCount + (optimisticIsLiked ? 1 : 0);

  return {
    optimisticIsLiked,
    optimisticLikeCounts,
    toggleLike: handleToggleLike,
    isLoading,
  };
}
