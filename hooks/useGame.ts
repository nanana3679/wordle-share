import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  initializeGame,
  addLetterToGuess,
  removeLetterFromGuess,
  submitGuess,
  selectRandomWord,
  isGameComplete,
  type GameState
} from "@/lib/wordleGame";
import type { ScriptAdapter } from "@/lib/scripts/types";
import { scriptUsesIme } from "@/lib/scripts";
import { Deck } from "@/types/decks";
import { getWordStrings } from "@/lib/deckHelpers";

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
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showGameResultModal, setShowGameResultModal] = useState(false);
  const [gameResultType, setGameResultType] = useState<'success' | 'failure' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 게임 초기화
  useEffect(() => {
    const wordList = getWordStrings(deck);
    if (wordList.length === 0) {
      throw new Error('이 덱에는 단어가 없습니다.');
    }

    // 랜덤 단어 선택 및 게임 초기화
    const targetWord = selectRandomWord(wordList);
    const initialGameState = initializeGame(targetWord, 6, wordList, adapter);
    setGameState(initialGameState);
  }, [deck, adapter]);

  // 키보드 입력 처리
  // 줄이 가득 찼는지 검사는 addLetterToGuess 내부에서 어댑터의 splitUnits 기반으로 수행한다.
  // 여기서 string length로 사전 가드를 하면 한글처럼 unit≠char인 스크립트에서
  // 첫 자모만 들어가고 나머지가 차단되는 버그가 생긴다.
  const handleKeyPress = useCallback((key: string) => {
    if (!gameState || isGameComplete(gameState)) return;

    setGameState(prevState => {
      if (!prevState) return null;
      return addLetterToGuess(prevState, key);
    });
  }, [gameState]);

  const handleBackspace = useCallback(() => {
    if (!gameState || isGameComplete(gameState)) return;
    
    setGameState(prevState => {
      if (!prevState) return null;
      return removeLetterFromGuess(prevState);
    });
  }, [gameState]);

  const handleEnter = useCallback(() => {
    if (!gameState || isGameComplete(gameState) || isSubmitting) return;

    // 줄 채움 검증은 submitGuess 내부의 splitUnits 기반 로직에 위임한다.
    // 여기서 string length로 사전 체크하면 unit≠char인 한글 등에서 제출이 차단된다.

    // 중복 제출 방지
    setIsSubmitting(true);

    // submitGuess를 먼저 실행하여 결과 확인
    const newState = submitGuess(gameState);

    // submitGuess가 변화 없이 반환한 경우(줄 미충족 등) → 아무것도 안 함
    if (newState === gameState) {
      setIsSubmitting(false);
      return;
    }
    
    // 에러 메시지가 있으면 toast로 표시하고 상태 업데이트하지 않음
    if (newState.errorMessage) {
      toast.error(newState.errorMessage);
      // 에러가 있을 때만 상태 업데이트 (errorMessage는 포함하지 않음)
      setGameState(newState);
      setIsSubmitting(false);
      return;
    }
    
    // 정상적인 경우 상태 업데이트
    setGameState(newState);
    setIsSubmitting(false);
    
    // 게임이 끝났다면 결과 애니메이션 표시
    if (isGameComplete(newState)) {
      setTimeout(() => setShowResult(true), 600);
      // 게임 결과 모달 표시
      if (newState.gameStatus === 'won') {
        setGameResultType('success');
        setTimeout(() => setShowGameResultModal(true), 1200);
      } else if (newState.gameStatus === 'lost') {
        setGameResultType('failure');
        setTimeout(() => setShowGameResultModal(true), 1200);
      }
    }
  }, [gameState, isSubmitting]);

  // 키보드 이벤트 처리
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!gameState || isGameComplete(gameState)) return;

      // 특수 키는 영문 그대로 비교 (브라우저 KeyboardEvent.key 표준값)
      const rawKey = event.key;
      const upperKey = rawKey.toUpperCase();

      // Enter는 IME 조합 중에도 통과시킨다.
      // 한국어 IME는 마지막 자모 입력 후에도 composition 상태를 유지하므로
      // isComposing 가드를 걸면 사용자가 Enter를 두 번 눌러야 제출되는 문제가 생긴다.
      // 우리는 compositionupdate에서 매 자모를 실시간 dispatch하므로 이 시점의
      // currentGuess는 이미 최신 상태다.
      if (upperKey === 'ENTER') {
        event.preventDefault();
        handleEnter();
        return;
      }

      // IME 조합 중에는 letter / Backspace 처리 금지.
      // (Backspace는 IME가 처리 → compositionupdate → reconcile에서 자모 단위 삭제)
      if (event.isComposing || event.keyCode === 229) return;

      if (upperKey === 'BACKSPACE' || upperKey === 'DELETE') {
        event.preventDefault();
        handleBackspace();
        return;
      }

      // IME 기반 스크립트는 hidden input의 composition 경로로만 입력을 받는다
      // (전역 keydown으로 직접 입력하면 hidden input과 중복 누적됨)
      if (scriptUsesIme(adapter.id)) return;

      // 한 글자 입력: keyId는 키보드 상태 식별자라 입력 문자로 쓰면
      // 비라틴 스크립트에서 currentGuess가 깨질 수 있음. 실제 입력 문자를 그대로 전달.
      if (rawKey.length === 1 && adapter.isAllowedChar(rawKey)) {
        event.preventDefault();
        handleKeyPress(rawKey);
        return;
      }

      // 다른 모든 키 차단
      if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, handleKeyPress, handleBackspace, handleEnter, adapter]);

  // 게임 재시작
  const restartGame = useCallback(() => {
    const wordList = getWordStrings(deck);
    if (wordList.length === 0) return;

    const targetWord = selectRandomWord(wordList);
    const newGameState = initializeGame(targetWord, 6, wordList, adapter);
    setGameState(newGameState);
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

