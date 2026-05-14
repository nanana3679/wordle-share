import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { isGameComplete, type GameState } from "@/lib/wordleGame";
import { createGameEngine, type GameEngine } from "@/lib/gameEngine";
import type { ScriptAdapter } from "@/lib/scripts/types";
import { scriptUsesIme } from "@/lib/scripts";
import { Deck } from "@/types/decks";

export interface UseGameReturn {
  gameState: GameState | null;
  showResult: boolean;
  showGameResultModal: boolean;
  gameResultType: 'success' | 'failure' | null;
  handleKeyPress: (key: string) => void;
  handleBackspace: () => void;
  handleEnter: () => void;
  restartGame: () => void;
  setShowGameResultModal: (show: boolean) => void;
}

export function useGame(deck: Deck, adapter: ScriptAdapter): UseGameReturn {
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showGameResultModal, setShowGameResultModal] = useState(false);
  const [gameResultType, setGameResultType] = useState<'success' | 'failure' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 게임 초기화
  useEffect(() => {
    const engine = createGameEngine(deck, adapter.id);
    engineRef.current = engine;
    setGameState(engine.state);
  }, [deck, adapter.id]);

  // 키보드 입력 처리
  const handleKeyPress = useCallback((key: string) => {
    if (!engineRef.current || !gameState || isGameComplete(gameState)) return;

    const next = engineRef.current.addLetter(key);
    engineRef.current = next;
    setGameState(next.state);
  }, [gameState]);

  const handleBackspace = useCallback(() => {
    if (!engineRef.current || !gameState || isGameComplete(gameState)) return;

    const next = engineRef.current.removeLetter();
    engineRef.current = next;
    setGameState(next.state);
  }, [gameState]);

  const handleEnter = useCallback(() => {
    if (!engineRef.current || !gameState || isGameComplete(gameState) || isSubmitting) return;

    setIsSubmitting(true);

    const { engine: next, result } = engineRef.current.submitGuess();

    // 줄 미충족 — 아무것도 안 함
    if (result.type === 'incomplete') {
      setIsSubmitting(false);
      return;
    }

    // 유효 단어 검사 실패 — toast + 상태 반영
    if (result.type === 'invalid') {
      toast.error(result.reason);
      engineRef.current = next;
      setGameState(next.state);
      setIsSubmitting(false);
      return;
    }

    // 정상 제출
    engineRef.current = next;
    setGameState(next.state);
    setIsSubmitting(false);

    // 게임 종료 처리
    if (isGameComplete(next.state)) {
      setTimeout(() => setShowResult(true), 600);
      if (next.state.gameStatus === 'won') {
        setGameResultType('success');
        setTimeout(() => setShowGameResultModal(true), 1200);
      } else if (next.state.gameStatus === 'lost') {
        setGameResultType('failure');
        setTimeout(() => setShowGameResultModal(true), 1200);
      }
    }
  }, [gameState, isSubmitting]);

  // 키보드 이벤트 처리
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!gameState || isGameComplete(gameState)) return;

      const rawKey = event.key;
      const upperKey = rawKey.toUpperCase();

      // Enter는 IME 조합 중에도 통과시킨다.
      if (upperKey === 'ENTER') {
        event.preventDefault();
        handleEnter();
        return;
      }

      // IME 조합 중에는 letter / Backspace 처리 금지.
      if (event.isComposing || event.keyCode === 229) return;

      if (upperKey === 'BACKSPACE' || upperKey === 'DELETE') {
        event.preventDefault();
        handleBackspace();
        return;
      }

      // IME 기반 스크립트는 hidden input의 composition 경로로만 입력을 받는다
      if (scriptUsesIme(adapter.id)) return;

      if (rawKey.length === 1 && adapter.isAllowedChar(rawKey)) {
        event.preventDefault();
        handleKeyPress(rawKey);
        return;
      }

      if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, handleKeyPress, handleBackspace, handleEnter, adapter]);

  // 게임 재시작
  const restartGame = useCallback(() => {
    const engine = createGameEngine(deck, adapter.id);
    engineRef.current = engine;
    setGameState(engine.state);
    setShowResult(false);
    setShowGameResultModal(false);
    setGameResultType(null);
    setIsSubmitting(false);
  }, [deck, adapter]);

  return {
    gameState,
    showResult,
    showGameResultModal,
    gameResultType,
    handleKeyPress,
    handleBackspace,
    handleEnter,
    restartGame,
    setShowGameResultModal,
  };
}
