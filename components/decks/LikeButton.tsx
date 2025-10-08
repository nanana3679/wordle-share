"use client";

import { useOptimisticLike } from "@/hooks/useOptimisticLike";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Deck } from "@/app/actions/deck";

export function LikeButton({ deck }: { deck: Deck }) {
  const { optimisticLike, toggleLike } = useOptimisticLike(
    { likeCount: deck.likes?.length || 0, isLiked: deck.isLiked || false },
    deck.id
  );

  const handleToggleLike = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    await toggleLike();
  };

  return (
    <Button
      size="sm"
      onClick={handleToggleLike}
      className="group flex items-center gap-1 bg-white hover:bg-white text-gray-500"
    >
      <Heart
        className={`w-4 h-4 transition-colors group-hover:scale-110 ${
          optimisticLike.isLiked
            ? "fill-red-500 text-red-500"
            : "text-gray-500"
        }`}
      />
      <span className="text-sm">{optimisticLike.likeCount}</span>
    </Button>
  );
}

