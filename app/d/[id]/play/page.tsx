import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { isSupportedScript } from "@/lib/scripts";
import { DailyGame } from "@/components/DailyGame";
import { ChallengeGame } from "@/components/ChallengeGame";

interface PlayPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}

// /d/{deck_id}/play?mode=daily|challenge — 단어 리스트는 HTML/props에 절대 포함하지 않는다 (ADR 0008)
export default async function PlayPage({ params, searchParams }: PlayPageProps) {
  const { id } = await params;
  const { mode = "daily" } = await searchParams;

  const supabase = await createClient();
  const { data: deck } = await supabase
    .from("decks")
    .select("id, name, script, hidden")
    .eq("id", id)
    .single();
  if (!deck || !isSupportedScript(deck.script)) notFound();

  if (mode !== "daily" && mode !== "challenge") notFound();

  // 가려진 덱은 플레이 차단 — server action도 동일하게 거부한다 (#55)
  if (deck.hidden) {
    return (
      <main className="mx-auto max-w-xl px-4 py-8 text-center text-sm text-muted-foreground">
        비공개 덱은 플레이할 수 없습니다.
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-8">
      <h1 className="text-center text-2xl font-bold">
        {deck.name}
        {mode === "challenge" && <span className="ml-2 text-base font-normal">🔥 챌린지</span>}
      </h1>
      {mode === "challenge" ? (
        <ChallengeGame deckId={deck.id} deckName={deck.name} script={deck.script} />
      ) : (
        <DailyGame deckId={deck.id} deckName={deck.name} script={deck.script} />
      )}
    </main>
  );
}
