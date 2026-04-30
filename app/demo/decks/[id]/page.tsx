import { notFound } from "next/navigation";
import { getDeck } from "@/app/actions/deck";
import { DeckDetailStatic } from "@/components/decks/DeckDetailStatic";
import { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

interface DeckPageProps {
  params: Promise<{
    id: string;
  }>;
}

const LOCALE_TO_OG: Record<string, string> = {
  ko: "ko_KR",
  en: "en_US",
  ja: "ja_JP",
};

// 동적 메타데이터 생성
export async function generateMetadata({ params }: DeckPageProps): Promise<Metadata> {
  const { id } = await params;
  const { data: deck } = await getDeck(id);

  if (!deck) {
    notFound();
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const deckUrl = `${siteUrl}/demo/decks/${id}`;

  const tMeta = await getTranslations("Pages.deckMeta");
  const locale = await getLocale();

  const titleSuffix = tMeta("titleSuffix");
  const deckName = deck.name?.trim() ?? "";
  const fullTitle = deckName ? `${deckName} - ${titleSuffix}` : titleSuffix;
  const altPreview = tMeta("imageAlt", { name: deckName });

  // 덱 설명이 있으면 사용하고, 없으면 기본 설명 생성
  const description =
    deck.description ||
    tMeta("defaultDescription", {
      name: deckName,
      count: deck.words?.length || 0,
    });

  // 썸네일 이미지가 있으면 사용하고, 없으면 favicon 사용
  const ogImage = deck.thumbnail_url || `${siteUrl}/favicon.svg`;

  // 썸네일이 없을 때는 favicon을 사용하므로 작은 크기
  const imageWidth = deck.thumbnail_url ? 1200 : 512;
  const imageHeight = deck.thumbnail_url ? 630 : 512;

  return {
    title: fullTitle,
    description,
    openGraph: {
      title: fullTitle,
      description,
      url: deckUrl,
      siteName: "wordledecks",
      images: [
        {
          url: ogImage,
          width: imageWidth,
          height: imageHeight,
          alt: altPreview,
        },
      ],
      locale: LOCALE_TO_OG[locale] ?? "ko_KR",
      type: "website",
    },
    twitter: {
      card: deck.thumbnail_url ? "summary_large_image" : "summary",
      title: fullTitle,
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
  const { data: deck } = await getDeck(id);

  if (!deck) {
    notFound();
  }

  return <DeckDetailStatic deck={deck} />;
}
