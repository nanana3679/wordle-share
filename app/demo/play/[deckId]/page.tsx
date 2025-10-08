"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { WordleGrid } from "@/components/games/WordleGrid";
import { WordleKeyboard } from "@/components/games/WordleKeyboard";
import { GameResultModal } from "@/components/games/GameResultModal";
import Loading from "@/components/common/Loading";
import { isGameComplete } from "@/lib/wordleGame";
import { useGame } from "@/hooks/useGame";

// 게임 데이터를 로드하는 컴포넌트
function GameLoader({ deckId }: { deckId: string }) {
  const {
    deck,
    gameState,
    showResult,
    showGameResultModal,
    gameResultType,
    handleKeyPress,
    handleBackspace,
    handleEnter,
    restartGame,
    setShowGameResultModal,
  } = useGame(deckId);

  if (!deck || !gameState) {
    return null; // 데이터가 아직 로드되지 않았거나 에러가 발생한 경우
  }

  return (
    <div className="min-h-screen bg-gray-50 p-5 max-[480px]:p-2.5">
      <div className="text-center mb-8">
        <h1 className="text-3xl max-[480px]:text-2xl mb-2.5 text-gray-800">
          {deck.name}
        </h1>
      </div>

      <WordleGrid gameState={gameState} showResult={showResult} />

      <WordleKeyboard
        onKeyPress={handleKeyPress}
        onBackspace={handleBackspace}
        onEnter={handleEnter}
        keyboardState={gameState.keyboardState}
        disabled={isGameComplete(gameState)}
      />

      <GameResultModal
        isOpen={showGameResultModal}
        onClose={() => setShowGameResultModal(false)}
        type={gameResultType || 'success'}
        attempts={gameResultType === 'success' ? gameState.guesses.length : undefined}
        targetWord={gameResultType === 'failure' ? gameState.targetWord : undefined}
        onRestart={restartGame}
      />
    </div>
  );
}

// 메인 PlayPage 컴포넌트
export default function PlayPage() {
  const { deckId } = useParams();

  return (
    <Suspense fallback={<Loading />}>
      <GameLoader deckId={deckId as string} />
    </Suspense>
  );
}
