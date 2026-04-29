"use client";

import { useMemo } from "react";
import { WordleGrid } from "@/components/games/WordleGrid";
import { WordleKeyboard } from "@/components/games/WordleKeyboard";
import { GameResultModal } from "@/components/games/GameResultModal";
import { isGameComplete } from "@/lib/wordleGame";
import { getScriptAdapter, scriptUsesIme } from "@/lib/scripts";
import { useGame } from "@/hooks/useGame";
import { useImeInput } from "@/hooks/useImeInput";
import { Deck } from "@/types/decks";

interface GameLoaderProps {
  deck: Deck;
}

export function GameLoader({ deck }: GameLoaderProps) {
  const adapter = useMemo(() => getScriptAdapter(deck.script), [deck.script]);
  const usesIme = scriptUsesIme(adapter.id);

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
  } = useGame(deck, adapter);

  const gameOver = gameState ? isGameComplete(gameState) : true;
  const { inputRef, inputProps } = useImeInput({
    adapter,
    onUnit: handleKeyPress,
    onBackspace: handleBackspace,
    enabled: usesIme && !gameOver,
  });

  if (!gameState) {
    return null; // 데이터가 아직 로드되지 않았거나 에러가 발생한 경우
  }

  return (
    <div className={`min-h-screen bg-gray-50 p-5 max-[480px]:p-2.5 script-${adapter.id}`}>
      {usesIme && (
        <input
          ref={inputRef}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          autoFocus
          aria-label="한글 입력"
          className="ime-hidden-input"
          {...inputProps}
        />
      )}

      <WordleGrid gameState={gameState} adapter={adapter} showResult={showResult} />

      <WordleKeyboard
        onKeyPress={handleKeyPress}
        onBackspace={handleBackspace}
        onEnter={handleEnter}
        keyboardState={gameState.keyboardState}
        adapter={adapter}
        disabled={gameOver}
      />

      <GameResultModal
        isOpen={showGameResultModal}
        onClose={() => setShowGameResultModal(false)}
        type={gameResultType || 'success'}
        attempts={gameResultType === 'success' ? gameState.guesses.length : undefined}
        targetWord={gameResultType === 'failure' ? gameState.targetWord : undefined}
        onRestart={restartGame}
      />

      <style jsx global>{`
        /* IME가 정상 동작하려면 화면에 "실재"하는 input이어야 한다.
           pointer-events: none / display: none / visibility: hidden은 일부 브라우저에서
           IME 활성화를 막으므로 사용 금지. 화면 밖으로 밀어 시각적으로만 숨긴다. */
        .ime-hidden-input {
          position: fixed;
          left: 0;
          top: 0;
          width: 1px;
          height: 1px;
          opacity: 0;
          border: 0;
          padding: 0;
          margin: 0;
          background: transparent;
          color: transparent;
          caret-color: transparent;
          z-index: -1;
        }
        .ime-hidden-input:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
}
