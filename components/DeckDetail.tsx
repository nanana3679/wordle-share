"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Deck } from "@/app/actions/deck";
import { getUserInfo } from "@/app/actions/user";
import { getLikeCount, isLikedByUser, toggleLike } from "@/app/actions/like";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Share2, Heart, Edit, Trash2, User, ArrowLeft, LogIn, LogOut } from "lucide-react";
import { useUser } from "@/hook/useUser";
import { useEffect, useState } from "react";
import Image from "next/image";
import { DeckDialog } from "@/components/DeckDialog";
import { DeleteDeckDialog } from "@/components/deleteDeckDialog";
import { toast } from "sonner";
import { signOut } from "@/app/actions/auth";

interface DeckDetailProps {
  deck: Deck;
}

type UserInfo = Awaited<ReturnType<typeof getUserInfo>>;

export function DeckDetail({ deck }: DeckDetailProps) {
  const { user } = useUser();
  const router = useRouter();
  const [creatorInfo, setCreatorInfo] = useState<UserInfo | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  
  // 현재 사용자가 덱의 생성자인지 확인
  const isCreator = user && deck.creator_id === user.id;

  const handleLogin = () => {
    router.push("/demo/login");
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("로그아웃 실패:", error);
    }
  };

  // 작성자 정보 가져오기
  useEffect(() => {
    if (deck.creator_id) {
      getUserInfo(deck.creator_id).then(setCreatorInfo);
    }
  }, [deck.creator_id]);

  // 좋아요 정보 가져오기
  useEffect(() => {
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
  }, [deck.id, user]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: deck.name || "Wordle 덱",
          text: deck.description || "",
          url: window.location.href,
        });
      } catch (error) {
        console.log("공유 취소됨");
      }
    } else {
      // 클립보드에 복사
      await navigator.clipboard.writeText(window.location.href);
      // TODO: 토스트 메시지 표시
    }
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 돌아가기 버튼 및 로그인/로그아웃 */}
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/demo/decks">
            <ArrowLeft className="h-4 w-4 mr-2" />
            덱 목록으로 돌아가기
          </Link>
        </Button>
        
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                로그아웃
              </Button>
            </div>
          ) : (
            <Button onClick={handleLogin}>
              <LogIn className="w-4 h-4 mr-2" />
              로그인
            </Button>
          )}
        </div>
      </div>

      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{deck.name}</h1>
            {deck.description && (
              <p className="text-muted-foreground text-lg">{deck.description}</p>
            )}
          </div>
          
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
        </div>

        {/* 썸네일 이미지 */}
        {deck.thumbnail_url && (
          <div className="mb-4">
            <div className="relative w-full h-48 sm:h-64 md:h-80 rounded-lg overflow-hidden">
              <Image
                src={deck.thumbnail_url}
                alt={deck.name || "덱 썸네일"}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          </div>
        )}

        {/* 작성자 정보 */}
        {creatorInfo && (
          <div className="mb-4 flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            {creatorInfo.avatar_url ? (
              <Image
                src={creatorInfo.avatar_url}
                alt={creatorInfo.name}
                width={40}
                height={40}
                className="rounded-full"
              />
            ) : (
              <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div>
              <p className="font-medium">{creatorInfo.name}</p>
            </div>
          </div>
        )}

        {/* 메타 정보 */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>단어 개수: {deck.words?.length || 0}개</span>
          <span>생성일: {new Date(deck.created_at).toLocaleDateString()}</span>
          {deck.is_public && <Badge variant="secondary">공개</Badge>}
          {!deck.is_public && <Badge variant="outline">비공개</Badge>}
        </div>
      </div>

      {/* 게임 시작 버튼 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            게임 시작
          </CardTitle>
          <CardDescription>
            이 덱의 단어 중 하나를 선택해서 Wordle 게임을 플레이해보세요!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href={`/demo/play/${deck.id}`}>
            <Button size="lg" className="w-full sm:w-auto">
              <Play className="h-4 w-4 mr-2" />
              게임 시작하기
            </Button>
          </Link>
        </CardContent>
      </Card>


      {/* 관리자 액션 (소유자인 경우) */}
      {isCreator && (
        <div className="mt-8 flex justify-center gap-4">
          <DeckDialog deck={deck}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              수정
            </Button>
          </DeckDialog>
          <DeleteDeckDialog deck={deck}>
            <Button variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              삭제
            </Button>
          </DeleteDeckDialog>
        </div>
      )}
    </div>
  );
}
