"use client";

import { useOptimisticLike } from "@/hooks/useOptimisticLike";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Deck } from "@/types/decks";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export function LikeButton({ deck }: { deck: Deck }) {
  const { optimisticIsLiked, optimisticLikeCounts, toggleLike, isLoading } = useOptimisticLike(deck);
  const { user } = useAuth();
  const t = useTranslations("Deck.like");

  const handleToggleLike = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (isLoading) return;
    if (!user) {
      toast.error(t("loginRequired"));
      return;
    }
    toggleLike();
  };

  return (
    <Button
      size="sm"
      onClick={handleToggleLike}
      className={`group flex items-center gap-1 bg-white hover:bg-white text-gray-500 px-0 ${isLoading ? "opacity-50" : ""}`}
    >
      <Heart
        className={`w-4 h-4 transition-colors group-hover:scale-110 ${
          optimisticIsLiked
            ? "fill-red-500 text-red-500"
            : "text-gray-500"
        }`}
      />
      <span className="text-sm">{optimisticLikeCounts}</span>
    </Button>
  );
}

