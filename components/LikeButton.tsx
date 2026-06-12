"use client";

import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getLikeStatus, toggleLike, type LikeActionResponse } from "@/app/actions/like";
import {
  initialLikeState,
  applyClick,
  applyServerConfirm,
  applyRollback,
  pendingDesired,
  LIKE_DEBOUNCE_MS,
  type LikeState,
} from "@/lib/optimistic-like";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  deckId: string;
  initialCount: number;
}

export function LikeButton({ deckId, initialCount }: LikeButtonProps) {
  const [state, setState] = useState<LikeState>(() => initialLikeState(false, initialCount));
  const stateRef = useRef(state);
  stateRef.current = state;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 본인 IP의 liked 여부는 서버만 안다 — 마운트 시 동기화
  useEffect(() => {
    let cancelled = false;
    getLikeStatus(deckId).then((result) => {
      if (cancelled || !result.success || !result.data) return;
      setState(initialLikeState(result.data.liked, result.data.likeCount));
    });
    return () => {
      cancelled = true;
    };
  }, [deckId]);

  const flush = async () => {
    const desired = pendingDesired(stateRef.current);
    if (desired === null) {
      // 연타로 원위치 — 전송 생략, snapshot만 해제
      setState((prev) => ({ ...prev, snapshot: null }));
      return;
    }

    const send = (): Promise<LikeActionResponse> => toggleLike(deckId, desired);
    let result = await send().catch(() => null);
    if (!result) result = await send().catch(() => null); // 네트워크 실패 1회 재시도 (AC)

    if (result?.success && result.data) {
      setState((prev) => applyServerConfirm(prev, {
        liked: result.data!.liked,
        count: result.data!.likeCount,
      }));
    } else {
      setState((prev) => applyRollback(prev));
      toast.error(result?.message ?? "네트워크 오류로 좋아요를 반영하지 못했습니다.");
    }
  };

  const handleClick = () => {
    setState((prev) => applyClick(prev)); // 즉시 반영 (AC)
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void flush(), LIKE_DEBOUNCE_MS); // 200ms debounce (AC)
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <Button type="button" variant="outline" onClick={handleClick} aria-pressed={state.liked}>
      <Heart className={cn("size-4", state.liked && "fill-red-500 text-red-500")} />
      {state.count}
    </Button>
  );
}
