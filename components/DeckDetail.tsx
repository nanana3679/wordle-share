"use client";

import Link from "next/link";
import { Deck } from "@/app/actions/deck";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Play, Share2, Heart, Edit, Trash2 } from "lucide-react";

interface DeckDetailProps {
  deck: Deck;
}

export function DeckDetail({ deck }: DeckDetailProps) {
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

  const handleLike = () => {
    // TODO: 좋아요 기능 구현
    console.log("좋아요 클릭");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
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
            <Button onClick={handleLike} variant="outline" size="sm">
              <Heart className="h-4 w-4 mr-2" />
              좋아요
            </Button>
            <Button onClick={handleShare} variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              공유
            </Button>
          </div>
        </div>

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

      {/* 단어 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>단어 목록</CardTitle>
          <CardDescription>
            이 덱에 포함된 모든 단어들입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deck.words && deck.words.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {deck.words.map((word, index) => (
                <div
                  key={index}
                  className="bg-muted/50 px-3 py-2 rounded-md text-center font-medium"
                >
                  {word.toUpperCase()}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              단어가 없습니다.
            </p>
          )}
        </CardContent>
      </Card>

      {/* 관리자 액션 (소유자인 경우) */}
      <div className="mt-8 flex justify-center gap-4">
        <Button variant="outline" asChild>
          <Link href={`/demo/decks/${deck.id}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            수정
          </Link>
        </Button>
        <Button variant="destructive" asChild>
          <Link href={`/demo/decks/${deck.id}/delete`}>
            <Trash2 className="h-4 w-4 mr-2" />
            삭제
          </Link>
        </Button>
      </div>
    </div>
  );
}
