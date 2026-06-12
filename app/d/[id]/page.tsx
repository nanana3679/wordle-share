import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeckById } from "@/app/actions/deck";
import { DeckMetaCard } from "@/components/DeckMetaCard";
import { CommentThread } from "@/components/CommentThread";
import { LikeButton } from "@/components/LikeButton";
import { ReportButton } from "@/components/ReportButton";
import { HiddenDeckBanner } from "@/components/HiddenDeckBanner";
import { Button } from "@/components/ui/button";

interface DeckPageProps {
  params: Promise<{ id: string }>;
}

const SCRIPT_LABELS: Record<string, string> = {
  latin: "로마자",
  hangul: "한글",
  kana: "가나",
};

// SSR 메타 + OG/Twitter Card — 단어 내용은 절대 포함하지 않는다 (ADR 0012/0008)
// 가려진 덱은 검색 엔진 인덱싱 차단 (#55 — noindex)
export async function generateMetadata({ params }: DeckPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getDeckById(id);
  if (!result.success || !result.data) return { title: "wordledecks" };

  const { deck, words } = result.data;
  if (deck.hidden) {
    return {
      title: `${deck.name} | wordledecks`,
      robots: { index: false, follow: false },
    };
  }

  const activeWordCount = words.filter((w) => w.active).length;
  const title = `${deck.name} | wordledecks`;
  const description = `${SCRIPT_LABELS[deck.script] ?? deck.script} 단어 ${activeWordCount}개 — ${deck.creator_nick}님이 만든 워들 덱. 오늘의 단어에 도전해보세요.`;

  return {
    title,
    description,
    alternates: { canonical: `/d/${deck.id}` },
    openGraph: {
      title,
      description,
      url: `/d/${deck.id}`,
      images: [{ url: `/og/${deck.id}.png`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/og/${deck.id}.png`],
    },
  };
}

export default async function DeckPage({ params }: DeckPageProps) {
  const { id } = await params;
  const result = await getDeckById(id);
  if (!result.success || !result.data) notFound();

  const { deck, words } = result.data;
  const activeWordCount = words.filter((w) => w.active).length;

  // 직접 링크는 살아있되 인터랙션은 전부 차단 — 작성자 대응 경로만 노출 (ADR 0013)
  if (deck.hidden) {
    return (
      <main className="mx-auto max-w-xl space-y-6 px-4 py-8">
        <HiddenDeckBanner deckId={deck.id} />
        <DeckMetaCard deck={deck} activeWordCount={activeWordCount} />
      </main>
    );
  }

  // Schema.org JSON-LD (ADR 0012 — Game/CreativeWork)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Game",
    name: deck.name,
    url: `/d/${deck.id}`,
    author: { "@type": "Person", name: deck.creator_nick },
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/LikeAction",
      userInteractionCount: deck.like_count,
    },
  };

  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DeckMetaCard deck={deck} activeWordCount={activeWordCount} />
      <div className="flex gap-2">
        <Button asChild>
          <Link href={`/d/${deck.id}/play?mode=daily`}>오늘의 데일리 플레이</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/d/${deck.id}/edit`}>편집</Link>
        </Button>
        <LikeButton deckId={deck.id} initialCount={deck.like_count} />
        <ReportButton targetType="deck" targetId={deck.id} />
      </div>

      <CommentThread deckId={deck.id} />
    </main>
  );
}
