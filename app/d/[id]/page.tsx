import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeckById } from "@/app/actions/deck";
import { DeckMetaCard } from "@/components/DeckMetaCard";
import { Button } from "@/components/ui/button";

interface DeckPageProps {
  params: Promise<{ id: string }>;
}

export default async function DeckPage({ params }: DeckPageProps) {
  const { id } = await params;
  const result = await getDeckById(id);
  if (!result.success || !result.data) notFound();

  const { deck, words } = result.data;
  const activeWordCount = words.filter((w) => w.active).length;

  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-8">
      <DeckMetaCard deck={deck} activeWordCount={activeWordCount} />
      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link href={`/d/${deck.id}/edit`}>편집</Link>
        </Button>
        {/* 플레이(데일리 모드)는 T2b에서 추가된다 */}
      </div>
    </main>
  );
}
