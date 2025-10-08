"use client";

import { useOptimistic, useState, startTransition } from "react";
import { createLike, deleteLike } from "@/app/actions/like";
import { useAuth } from "./useAuth";
import { actionWithToast } from "@/lib/action-with-toast";

export type Like = {
  likeCount: number;
  isLiked: boolean;
};

type OptimisticAction = "LIKE" | "DISLIKE";

export function useOptimisticLike(initialLike: Like, deckId: string) {
  const [likeState, setLikeState] = useState<Like>(initialLike);
  const { user } = useAuth();

  const [optimisticState, addOptimisticState] = useOptimistic(
    likeState,
    (currentState, action: OptimisticAction) => {
      // 낙관적 업데이트 로직 (이 부분은 유지됩니다.)
      if (action === "LIKE") {
        // 이미 좋아요 상태라면 카운트를 변경하지 않음
        return currentState.isLiked 
          ? currentState 
          : { likeCount: currentState.likeCount + 1, isLiked: true };
      } else if (action === "DISLIKE") {
        // 이미 좋아요 취소 상태라면 카운트를 변경하지 않음
        return !currentState.isLiked 
          ? currentState 
          : { likeCount: currentState.likeCount - 1, isLiked: false };
      }
      return currentState;
    }
  );

  const toggleLike = async () => {
    if (!user) {
      await actionWithToast(async () => ({
        success: false,
        message: "로그인이 필요합니다.",
      }));
      return;
    }

    // 서버에 요청할 최종 상태를 결정합니다.
    const newIsLiked = !optimisticState.isLiked;
    const action: OptimisticAction = newIsLiked ? "LIKE" : "DISLIKE";

    // 1. 낙관적 업데이트 (Transition으로 감싸 자동 롤백 활성화)
    startTransition(() => { 
      // 현재 화면에 보이는 상태(optimisticState)를 기준으로 액션을 반영합니다.
      addOptimisticState(action);
    });

    try {
      // 2. 서버에 요청 전송 (showToast: false로 자동 toast 비활성화)
      let response;
      if (newIsLiked) {
        response = await actionWithToast(
          () => createLike(deckId, user.id),
          { showToast: false }
        );
        console.log("createLike", response);
      } else {
        response = await actionWithToast(
          () => deleteLike(deckId, user.id),
          { showToast: false }
        );
        console.log("deleteLike", response);
      }

      if (!response.success) {
        throw new Error(response.message);
      }

      // 3. 서버 요청 성공: 실제 상태를 최종 확정
      // 🚨 개선된 로직: setLikeState의 값을 낙관적 상태(optimisticState)에서 가져와 최종 확정합니다.
      // 이렇게 하면 연타로 인해 여러 번의 낙관적 업데이트가 발생했더라도,
      // 최종적으로 화면에 반영된 상태를 기준으로 실제 상태를 덮어쓰게 되어 카운트 점프 현상이 줄어듭니다.
      setLikeState({
        likeCount: optimisticState.likeCount,
        isLiked: optimisticState.isLiked,
      });

    } catch (error) {
      // 4. 서버 요청 실패: useOptimistic이 자동으로 낙관적 상태를 초기 상태(likeState)로 롤백
      console.error("좋아요 처리 실패:", error);
      await actionWithToast(async () => ({
        success: false,
        message: error instanceof Error ? error.message : "좋아요 처리에 실패했습니다.",
      }));
    }
  };

  return {
    optimisticLike: optimisticState,
    toggleLike,
  };
}