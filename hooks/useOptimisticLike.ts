"use client";

import { useOptimistic, useState, startTransition } from "react";
import { createLike, deleteLike } from "@/app/actions/like";
import { actionWithToast } from "@/lib/action-with-toast";
import { Deck } from "@/types/decks";

export function useOptimisticLike(deck: Deck) {
  const isLiked = deck.isLiked || false;
  const otherUsersLikeCount = (deck.likes?.length || 0) - (isLiked ? 1 : 0);
  const deckId = deck.id;

  const [isLikedState, setIsLikedState] = useState<boolean>(isLiked);
  const [isLoading, setIsLoading] = useState<boolean>(false); 

  const [optimisticIsLiked, toggleOptimisticIsLiked] = useOptimistic(
    isLikedState,
    (currentState) => {
      return !currentState;
    }
  );

  const toggleLike = async () => {
    // 서버에 요청할 최종 상태를 결정합니다.
    const newIsLiked = !optimisticIsLiked;
    setIsLoading(true);
    
    // 1. 낙관적 업데이트 (Transition으로 감싸 자동 롤백 활성화)
    startTransition(() => {
      toggleOptimisticIsLiked(newIsLiked);
      console.log("toggleOptimisticIsLiked", newIsLiked);
    });

    try {
      // 2. 서버에 요청 전송 (showToast: false로 자동 toast 비활성화)
      let response;
      if (newIsLiked) {
        response = await actionWithToast(
          () => createLike(deckId),
          { showToast: false }
        );
        console.log("createLike", response);
      } else {
        response = await actionWithToast(
          () => deleteLike(deckId),
          { showToast: false }
        );
        console.log("deleteLike", response);
      }

      if (!response.success) {
        throw new Error(response.message);
      }

      // 3. 서버 요청 성공: 실제 상태를 최종 확정
      setIsLikedState(newIsLiked);
      setIsLoading(false);
    } catch (error) {
      // 4. 서버 요청 실패: useOptimistic이 자동으로 낙관적 상태를 초기 상태(likeState)로 롤백
      console.error("좋아요 처리 실패:", error);
      await actionWithToast(async () => ({
        success: false,
        message: error instanceof Error ? error.message : "좋아요 처리에 실패했습니다.",
      }));
      setIsLoading(false);
    }
  };

  const optimisticLikeCounts = otherUsersLikeCount + (optimisticIsLiked ? 1 : 0);

  return {
    optimisticIsLiked,
    optimisticLikeCounts,
    toggleLike,
    isLoading,
  };
}