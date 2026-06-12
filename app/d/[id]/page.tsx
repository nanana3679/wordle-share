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

// 가려진 덱은 검색 엔진 인덱싱 차단 (#55 — noindex)
export async function generateMetadata({ params }: DeckPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getDeckById(id);
  if (!result.success || !result.data) return { title: "wordledecks" };

  const { deck } = result.data;
  return {
    title: `${deck.name} | wordledecks`,
    ...(deck.hidden ? { robots: { index: false, follow: false } } : {}),
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

  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-8">
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
