"use client";

import Link from "next/link";
import { Deck } from "@/app/actions/deck";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, User } from "lucide-react";
import Image from "next/image";
import { DeckHeaderActions } from "@/components/decks/DeckHeaderActions";
import { DeckCreatorActions } from "@/components/decks/DeckCreatorActions";

interface DeckDetailStaticProps {
  deck: Deck;
}

export function DeckDetailStatic({ deck }: DeckDetailStaticProps) {

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl relative">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{deck.name}</h1>
            {deck.description && (
              <p className="text-muted-foreground text-lg">{deck.description}</p>
            )}
          </div>
          <DeckHeaderActions deck={deck} />
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
                priority
              />
            </div>
          </div>
        )}

        {/* 작성자 정보 */}
        {deck.creator && (
          <div className="mb-4 flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            {deck.creator.user_metadata?.avatar_url ? (
              <Image
                src={deck.creator.user_metadata.avatar_url}
                alt={deck.creator.user_metadata.name || "작성자"}
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
              <p className="font-medium">{deck.creator.user_metadata?.name || "익명"}</p>
            </div>
          </div>
        )}

        {/* 메타 정보 */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>단어 개수: {deck.words?.length || 0}개</span>
          <span>좋아요: {deck.likes?.length || 0}개</span>
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

      {/* 작성자 액션 버튼들 */}
      <DeckCreatorActions deck={deck} />
    </div>
  );
}
