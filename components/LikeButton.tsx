"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleLike, type LikeActionResponse } from "@/app/actions/like";
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
  initialLiked: boolean;
}

export function LikeButton({ deckId, initialCount, initialLiked }: LikeButtonProps) {
  const t = useTranslations('common');
  const [state, setState] = useState<LikeState>(() => initialLikeState(initialLiked, initialCount));
  const stateRef = useRef(state);
  stateRef.current = state;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      toast.error(result?.message ?? t('networkError'));
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
