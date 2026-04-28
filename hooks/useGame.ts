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
  const handleKeyPress = useCallback((key: string) => {
    if (!gameState || isGameComplete(gameState)) return;
    
    setGameState(prevState => {
      if (!prevState) return null;
      
      // 현재 줄이 이미 완료된 경우 입력 차단
      if (prevState.currentGuess.length >= prevState.targetWord.length) {
        return prevState;
      }
      
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
    
    // 현재 줄이 완전히 채워지지 않은 경우 제출 불가
    if (gameState.currentGuess.length !== gameState.targetWord.length) {
      return;
    }
    
    // 중복 제출 방지
    setIsSubmitting(true);
    
    // submitGuess를 먼저 실행하여 결과 확인
    const newState = submitGuess(gameState);
    
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

      if (upperKey === 'ENTER') {
        event.preventDefault();
        handleEnter();
        return;
      }

      if (upperKey === 'BACKSPACE' || upperKey === 'DELETE') {
        event.preventDefault();
        handleBackspace();
        return;
      }

      // 한 글자 입력은 어댑터로 위임
      if (rawKey.length === 1 && adapter.isAllowedChar(rawKey)) {
        event.preventDefault();
        handleKeyPress(adapter.keyId(rawKey));
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

