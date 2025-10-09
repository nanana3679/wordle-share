import { Suspense } from "react";
import { getDeck } from "@/app/actions/deck";
import { GameLoader } from "@/components/games/GameLoader";
import Loading from "@/components/common/Loading";

export default async function PlayPage({
  params,
}: {
  params: { deckId: string };
}) {
  const response = await getDeck(params.deckId);

  if (!response.success || !response.data) {
    throw new Error(response.message || '덱을 찾을 수 없습니다.');
  }

  return (
    <Suspense fallback={<Loading />}>
      <GameLoader deck={response.data} />
    </Suspense>
  );
}
