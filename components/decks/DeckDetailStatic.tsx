"use client";

import Link from "next/link";
import { Deck } from "@/types/decks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, User } from "lucide-react";
import Image from "next/image";
import { LikeButton } from "@/components/decks/LikeButton";
import { ShareButton } from "@/components/decks/ShareButton";
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
            <h1 className="text-3xl font-bold mb-4">{deck.name}</h1>
           
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
                priority
              />
            </div>
          </div>
        )}

        {/* 작성자 정보 */}
        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
          {deck.creator?.user_metadata?.avatar_url ? (
            <Image
              src={deck.creator?.user_metadata?.avatar_url}
              alt={deck.creator?.user_metadata?.name || "작성자"}
              width={40}
              height={40}
              className="rounded-full"
            />
          ) : (
            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 flex items-center">
            <p className="font-medium">{deck.creator?.user_metadata?.name || "익명"}</p>
          </div>
          <div className="flex items-center gap-2">
            <LikeButton deck={deck} />
            <ShareButton />
            <Link href={`/demo/play/${deck.id}`}>
              <Button size="lg" className="">
                <Play className="h-4 w-4 mr-2" />
                플레이
              </Button>
            </Link>
          </div>
        </div>

        {/* 메타 정보 */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground p-3">
          <span>단어 개수: {deck.words?.length || 0}개</span>
          <span>생성일: {new Date(deck.created_at).toLocaleDateString()}</span>
          {deck.is_public && <Badge variant="secondary">공개</Badge>}
          {!deck.is_public && <Badge variant="outline">비공개</Badge>}
        </div>

        {/* 상세 설명 */}
        {deck.description && (
          <p className="text-muted-foreground text-lg mb-4 p-3">{deck.description}</p>
        )}
      </div>

      {/* 작성자 액션 버튼들 */}
      {deck.isCreator && <DeckCreatorActions deck={deck} />}
    </div>
  );
}
