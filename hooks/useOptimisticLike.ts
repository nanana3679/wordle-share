"use client";

import { useOptimistic, useState, startTransition } from "react";
import { createLike, deleteLike } from "@/app/actions/like";
import { callAction } from "@/lib/callAction";
import { toast } from "sonner";
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
        response = await callAction(() => createLike(deckId));
        console.log("createLike", response);
      } else {
        response = await callAction(() => deleteLike(deckId));
        console.log("deleteLike", response);
      }

      if (!response.success) {
        // callAction은 실패 시 throw하지 않고 반환하므로 명시적으로 롤백
        startTransition(() => {
          setIsLikedState(isLikedState); // 원래 값으로 복구
        });
        toast.error(response.message || "좋아요 처리에 실패했습니다.");
        setIsLoading(false);
        return;
      }

      // 3. 서버 요청 성공: 실제 상태를 최종 확정
      startTransition(() => {
        setIsLikedState(newIsLiked);
      });
      setIsLoading(false);
    } catch (error) {
      // 4. 예외 발생 시: 명시적으로 원래 상태로 복구
      startTransition(() => {
        setIsLikedState(isLikedState); // 원래 값으로 복구
      });
      console.error("좋아요 처리 실패:", error);
      toast.error(error instanceof Error ? error.message : "좋아요 처리에 실패했습니다.");
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