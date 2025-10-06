import { notFound } from "next/navigation";
import { getDeck } from "@/app/actions/deck";
import { DeckDetailStatic } from "@/components/DeckDetailStatic";
import { Metadata } from "next";

interface DeckPageProps {
  params: Promise<{
    id: string;
  }>;
}

// 동적 메타데이터 생성
export async function generateMetadata({ params }: DeckPageProps): Promise<Metadata> {
  const { id } = await params;
  const deck = await getDeck(id);
  
  if (!deck) {
    return {
      title: "덱을 찾을 수 없습니다",
      description: "요청하신 덱을 찾을 수 없습니다.",
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const deckUrl = `${siteUrl}/demo/decks/${id}`;
  
  // 덱 설명이 있으면 사용하고, 없으면 기본 설명 생성
  const description = deck.description || 
    `${deck.name} - ${deck.words?.length || 0}개의 단어가 포함된 Wordle 덱입니다. 지금 플레이해보세요!`;
  
  // 썸네일 이미지가 있으면 사용하고, 없으면 기본 이미지
  const ogImage = deck.thumbnail_url || 
    `${siteUrl}/api/og?title=${encodeURIComponent(deck.name || 'Wordle Deck')}&words=${deck.words?.length || 0}`;

  return {
    title: `${deck.name} - Wordle Deck`,
    description,
    openGraph: {
      title: `${deck.name} - Wordle Deck`,
      description,
      url: deckUrl,
      siteName: "wordledecks",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${deck.name} 덱 미리보기`,
        },
      ],
      locale: "ko_KR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${deck.name} - Wordle Deck`,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: deckUrl,
    },
  };
}

export default async function DeckPage({ params }: DeckPageProps) {
  const { id } = await params;
  const deck = await getDeck(id);
  
  if (!deck) {
    notFound();
  }

  return <DeckDetailStatic deck={deck} />;
}
