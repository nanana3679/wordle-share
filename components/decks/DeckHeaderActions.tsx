"use client";

import { Deck } from "@/types/decks";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { LikeButton } from "./LikeButton";

interface DeckHeaderActionsProps {
  deck: Deck;
}

export function DeckHeaderActions({ deck }: DeckHeaderActionsProps) {
  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast.success("공유 링크가 클립보드에 복사되었습니다.");
  };

  return (
    <div className="flex gap-2 ml-4">
      <LikeButton deck={deck} />
      <Button onClick={handleShare} variant="outline" size="sm">
        <Share2 className="h-4 w-4 mr-2" />
        공유
      </Button>
    </div>
  );
}
