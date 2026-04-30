import { Suspense } from "react";
import { getDeck } from "@/app/actions/deck";
import { GameLoader } from "@/components/games/GameLoader";
import Loading from "@/components/common/Loading";
import { getTranslations } from "next-intl/server";

export default async function PlayPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const { deckId } = await params;
  const response = await getDeck(deckId);
  const t = await getTranslations("Game.errors");

  if (!response.success || !response.data) {
    throw new Error(response.message || t('deckNotFound'));
  }

  return (
    <Suspense fallback={<Loading />}>
      <GameLoader deck={response.data} />
    </Suspense>
  );
}
