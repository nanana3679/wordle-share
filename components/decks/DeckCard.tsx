import Link from "next/link";
import { Deck } from "@/types/decks";
import { Card, CardContent } from "@/components/ui/card";
import { LikeButton } from "./LikeButton";
import Image from 'next/image';

interface DeckCardProps {
  deck: Deck;
}

export function DeckCard({ deck }: DeckCardProps) {

  return (
    <Link 
      href={`/demo/decks/${deck.id}`} 
      className="block no-underline text-inherit"
    >
      <Card className="h-full flex flex-col transition-all duration-200 border-none cursor-pointer relative hover:-translate-y-1 hover:shadow-lg p-0 gap-0">
        {/* 덱 이미지 */}
        <div className="h-52 overflow-hidden rounded-t-lg bg-gray-50 flex items-center justify-center">
          {deck.thumbnail_url ? (
            <div className="relative w-[400px] h-[208px] overflow-hidden">
              <Image
                src={deck.thumbnail_url}
                alt={deck.name || "덱 이미지"}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover transition-transform duration-200 group-hover:scale-105"
                priority
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
              <div className="text-6xl md:text-7xl opacity-80" />
            </div>
          )}
        </div>

        <CardContent className="h-14 p-4 flex items-center justify-start text-left">
          {/* 덱 제목 */}
          <h3 className="text-sm md:text-base font-normal text-gray-900 leading-tight line-clamp-2 m-0">
            {deck.name || "이름 없음"}
          </h3>
        </CardContent>

        {/* 좋아요 버튼 */}
        <div className="absolute top-3 right-3 z-10">
          <LikeButton deck={deck} />
        </div>
      </Card>
    </Link>
  );
}
