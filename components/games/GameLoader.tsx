"use client";

import { WordleGrid } from "@/components/games/WordleGrid";
import { WordleKeyboard } from "@/components/games/WordleKeyboard";
import { GameResultModal } from "@/components/games/GameResultModal";
import { isGameComplete } from "@/lib/wordleGame";
import { useGame } from "@/hooks/useGame";
import { Deck } from "@/types/decks";

interface GameLoaderProps {
  deck: Deck;
}

export function GameLoader({ deck }: GameLoaderProps) {
  const {
    gameState,
    showResult,
    showGameResultModal,
    gameResultType,
    handleKeyPress,
    handleBackspace,
    handleEnter,
    restartGame,
    setShowGameResultModal,
  } = useGame(deck);

  if (!gameState) {
    return null; // 데이터가 아직 로드되지 않았거나 에러가 발생한 경우
  }

  return (
    <div className="min-h-screen bg-gray-50 p-5 max-[480px]:p-2.5">
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

