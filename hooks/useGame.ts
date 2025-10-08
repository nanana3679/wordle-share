import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { getDeck } from "@/app/actions/deck";
import { 
  initializeGame, 
  addLetterToGuess, 
  removeLetterFromGuess, 
  submitGuess,
  selectRandomWord,
  isGameComplete,
  type GameState 
} from "@/lib/wordleGame";
import { Deck } from "@/types/decks";

export interface UseGameReturn {
  deck: Deck | null;
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

export function useGame(deckId: string): UseGameReturn {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showGameResultModal, setShowGameResultModal] = useState(false);
  const [gameResultType, setGameResultType] = useState<'success' | 'failure' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 덱 로드
  useEffect(() => {
    const loadDeck = async () => {
      try {
        const response = await getDeck(deckId);
        
        if (!response.success || !response.data) {
          setError(new Error(response.message));
          return;
        }
        
        const deckData = response.data;
        setDeck(deckData);
        
        if (!deckData.words || deckData.words.length === 0) {
          setError(new Error('이 덱에는 단어가 없습니다.'));
          return;
        }
        
        // 랜덤 단어 선택 및 게임 초기화
        const targetWord = selectRandomWord(deckData.words);
        const initialGameState = initializeGame(targetWord, 6, deckData.words);
        setGameState(initialGameState);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('덱을 불러오는데 실패했습니다.');
        setError(error);
      }
    };

    if (deckId) {
      loadDeck();
    }
  }, [deckId]);

  // 에러가 발생한 경우 throw하여 Error Boundary에서 처리
  if (error) {
    throw error;
  }

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
      
      const key = event.key.toUpperCase();
      
      // 특수 키 처리
      if (key === 'ENTER') {
        event.preventDefault();
        handleEnter();
        return;
      }
      
      if (key === 'BACKSPACE' || key === 'DELETE') {
        event.preventDefault();
        handleBackspace();
        return;
      }
      
      // 알파벳만 허용 (길이가 1이고 A-Z인 경우만)
      if (key.length === 1 && key.match(/[A-Z]/)) {
        event.preventDefault();
        handleKeyPress(key);
        return;
      }
      
      // 다른 모든 키 차단
      if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, handleKeyPress, handleBackspace, handleEnter]);

  // 게임 재시작
  const restartGame = useCallback(() => {
    if (!deck?.words || deck.words.length === 0) return;
    
    const targetWord = selectRandomWord(deck.words);
    const newGameState = initializeGame(targetWord, 6, deck.words);
    setGameState(newGameState);
    setShowResult(false);
    setShowGameResultModal(false);
    setGameResultType(null);
    setIsSubmitting(false);
  }, [deck]);

  return {
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
  };
}

