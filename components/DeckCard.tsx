"use client";

import Link from "next/link";
import { Deck } from "@/app/actions/deck";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart } from "lucide-react";
import { toggleLike, getLikeCount, isLikedByUser } from "@/app/actions/like";
import { useUser } from "@/hook/useUser";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Image from 'next/image';

interface DeckCardProps {
  deck: Deck;
}

export function DeckCard({ deck }: DeckCardProps) {
  const { user } = useUser();
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLikeLoading, setIsLikeLoading] = useState(false);

  // 좋아요 정보 계산
  useEffect(() => {
    if (deck.likes) {
      // 덱에 포함된 좋아요 정보로부터 개수와 사용자 좋아요 상태 계산
      const likes = Array.isArray(deck.likes) ? deck.likes : [];
      setLikeCount(likes.length);
      
      if (user) {
        const userLiked = likes.some(like => like.user_id === user.id);
        setIsLiked(userLiked);
      } else {
        setIsLiked(false);
      }
    } else {
      // 좋아요 정보가 없는 경우 개별 API 호출
      const loadLikeInfo = async () => {
        try {
          const [count, liked] = await Promise.all([
            getLikeCount(deck.id),
            user ? isLikedByUser(deck.id, user.id) : false
          ]);
          setLikeCount(count);
          setIsLiked(liked);
        } catch (error) {
          console.error('좋아요 정보를 가져오는데 실패했습니다:', error);
        }
      };

      loadLikeInfo();
    }
  }, [deck.id, deck.likes, user]);

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

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
        toast.success("좋아요를 취소했습니다!");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "좋아요 처리에 실패했습니다.");
    } finally {
      setIsLikeLoading(false);
    }
  };

  return (
    <Link 
      href={`/demo/decks/${deck.id}`} 
      className="block no-underline text-inherit"
    >
      <Card className="h-full flex flex-col transition-all duration-200 border-none cursor-pointer relative hover:-translate-y-1 hover:shadow-lg p-0">
        {/* 덱 이미지 */}
        <div className="h-48 md:h-52 overflow-hidden rounded-t-lg bg-gray-50 flex items-center justify-center">
          {deck.thumbnail_url ? (
            <Image 
              src={deck.thumbnail_url} 
              alt={deck.name || "덱 이미지"}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
              <div className="text-6xl md:text-7xl opacity-80">🎯</div>
            </div>
          )}
        </div>

        <CardContent className="flex-1 p-4 flex items-center justify-center text-center">
          {/* 덱 제목 */}
          <h3 className="text-xl md:text-lg font-normal text-gray-900 leading-tight line-clamp-2 m-0">
            {deck.name || "이름 없음"}
          </h3>
        </CardContent>

        {/* 좋아요 버튼 */}
        <div className="absolute top-3 right-3 z-10">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleToggleLike}
            disabled={isLikeLoading}
            className="bg-white/90 backdrop-blur-sm border-none text-red-500 rounded-full shadow-md hover:bg-red-50 hover:text-red-600 hover:scale-110 transition-all duration-200 flex items-center justify-center gap-1 px-2 py-1"
          >
            <Heart 
              className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} 
            />
            {likeCount > 0 && (
              <span className="text-xs font-medium">{likeCount}</span>
            )}
          </Button>
        </div>
      </Card>
    </Link>
  );
}
