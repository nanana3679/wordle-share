"use client";

import { Deck } from "@/app/actions/deck";
import { Button } from "@/components/ui/button";
import { Share2, Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { isLikedByUser, toggleLike } from "@/app/actions/like";
import { toast } from "sonner";
import { useUser } from "@/hook/useUser";

interface DeckHeaderActionsProps {
  deck: Deck;
}

export function DeckHeaderActions({ deck }: DeckHeaderActionsProps) {
  const { user } = useUser();
  const [likeCount, setLikeCount] = useState(deck.likes?.length || 0);
  const [isLiked, setIsLiked] = useState(deck.isLiked || false);
  const [isLikeLoading, setIsLikeLoading] = useState(false);

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast.success("공유 링크가 클립보드에 복사되었습니다.");
  };

  const handleLike = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    setIsLikeLoading(true);
    
    try {
      const result = await toggleLike(deck.id);
      
      if (result.action === "added") {
        setLikeCount(prev => prev + 1);
        setIsLiked(true);
        toast.success("좋아요를 눌렀습니다!");
      } else {
        setLikeCount(prev => prev - 1);
        setIsLiked(false);
        toast.success("좋아요를 취소했습니다.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "좋아요 처리에 실패했습니다.");
    } finally {
      setIsLikeLoading(false);
    }
  };

  // 좋아요 정보 가져오기
  useEffect(() => {
    const loadLikeInfo = async () => {
      try {
        // 현재 사용자의 좋아요 상태만 확인
        if (user) {
          const liked = await isLikedByUser(deck.id, user.id);
          setIsLiked(liked);
        }
      } catch (error) {
        console.error('좋아요 정보를 가져오는데 실패했습니다:', error);
      }
    };

    loadLikeInfo();
  }, [deck.id, user]);

  return (
    <div className="flex gap-2 ml-4">
      <Button 
        onClick={handleLike} 
        variant="outline" 
        size="sm"
        disabled={isLikeLoading}
      >
        <Heart 
          className={`h-4 w-4 mr-2 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} 
        />
        {likeCount}
      </Button>
      <Button onClick={handleShare} variant="outline" size="sm">
        <Share2 className="h-4 w-4 mr-2" />
        공유
      </Button>
    </div>
  );
}
