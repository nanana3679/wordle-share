import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { isSupportedScript } from "@/lib/scripts";
import { DailyGame } from "@/components/DailyGame";

interface PlayPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}

// /d/{deck_id}/play?mode=daily — 단어 리스트는 HTML/props에 절대 포함하지 않는다 (ADR 0008)
export default async function PlayPage({ params, searchParams }: PlayPageProps) {
  const { id } = await params;
  const { mode = "daily" } = await searchParams;

  const supabase = await createClient();
  const { data: deck } = await supabase
    .from("decks")
    .select("id, name, script")
    .eq("id", id)
    .single();
  if (!deck || !isSupportedScript(deck.script)) notFound();

  if (mode !== "daily") {
    return (
      <main className="mx-auto max-w-xl px-4 py-8 text-center text-sm text-muted-foreground">
        챌린지 모드는 준비 중입니다.
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-8">
      <h1 className="text-center text-2xl font-bold">{deck.name}</h1>
      <DailyGame deckId={deck.id} deckName={deck.name} script={deck.script} />
    </main>
  );
}
