import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase-server";
import { isSupportedScript } from "@/lib/scripts";
import { DailyGame } from "@/components/DailyGame";
import { ChallengeGame } from "@/components/ChallengeGame";
import { PageTopBar } from "@/components/PageTopBar";

interface PlayPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}

// 게임 페이지는 인덱싱 차단 (ADR 0012, #51 AC)
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

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

  const t = await getTranslations("game.play");

  // 가려진 덱은 플레이 차단 — server action도 동일하게 거부한다 (#55)
  if (deck.hidden) {
    return (
      <main className="mx-auto max-w-xl space-y-6 px-4 py-8">
        <PageTopBar backHref={`/d/${deck.id}`} backLabel={t("backToDeck")} />
        <p className="text-center text-sm text-muted-foreground">{t("hiddenDeck")}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-8">
      <PageTopBar backHref={`/d/${deck.id}`} backLabel={t("backToDeck")} />
      <h1 className="text-center text-2xl font-bold">
        {deck.name}
        {mode === "challenge" && <span className="ml-2 text-base font-normal">{t("challengeModeLabel")}</span>}
      </h1>
      {mode === "challenge" ? (
        <ChallengeGame deckId={deck.id} deckName={deck.name} script={deck.script} />
      ) : (
        <DailyGame deckId={deck.id} deckName={deck.name} script={deck.script} />
      )}
    </main>
  );
}
