"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useParams } from "next/navigation";
import { getDeck } from "@/app/actions/deck";
import { WordleGrid } from "@/components/WordleGrid";
import { WordleKeyboard } from "@/components/WordleKeyboard";
import { GameResultModal } from "@/components/GameResultModal";
import Loading from "@/components/Loading";
import { 
  initializeGame, 
  addLetterToGuess, 
  removeLetterFromGuess, 
  submitGuess,
  selectRandomWord,
  isGameComplete,
  type GameState 
} from "@/lib/wordleGame";
import { Deck } from "@/app/actions/deck";

// 게임 데이터를 로드하는 컴포넌트
function GameLoader({ deckId }: { deckId: string }) {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showGameResultModal, setShowGameResultModal] = useState(false);
  const [gameResultType, setGameResultType] = useState<'success' | 'failure' | null>(null);

  // 덱 로드
  useEffect(() => {
    const loadDeck = async () => {
      try {
        const deckData = await getDeck(deckId);
        setDeck(deckData);
        
        if (!deckData.words || deckData.words.length === 0) {
          throw new Error('이 덱에는 단어가 없습니다.');
        }
        
        // 랜덤 단어 선택 및 게임 초기화
        const targetWord = selectRandomWord(deckData.words);
        const initialGameState = initializeGame(targetWord, 6);
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
    if (!gameState || isGameComplete(gameState)) return;
    
    setGameState(prevState => {
      if (!prevState) return null;
      
      // 현재 줄이 완전히 채워지지 않은 경우 제출 불가
      if (prevState.currentGuess.length !== prevState.targetWord.length) {
        return prevState;
      }
      
      const newState = submitGuess(prevState);
      
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
      
      return newState;
    });
  }, [gameState]);

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
    const newGameState = initializeGame(targetWord, 6);
    setGameState(newGameState);
    setShowResult(false);
    setShowGameResultModal(false);
    setGameResultType(null);
  }, [deck]);

  if (!deck || !gameState) {
    return null; // 데이터가 아직 로드되지 않았거나 에러가 발생한 경우
  }

  return (
    <div className="play-page">
      <div className="game-header">
        <h1>{deck.name}</h1>
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

      <style jsx global>{`
        .play-page {
          min-height: 100vh;
          background-color: #f8f9fa;
          padding: 20px;
        }
        
        .loading, .error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 50vh;
          text-align: center;
        }
        
        .game-header {
          text-align: center;
          margin-bottom: 30px;
        }
        
        .game-header h1 {
          font-size: 2rem;
          margin-bottom: 10px;
          color: #333;
        }
        
        .game-info {
          display: flex;
          gap: 20px;
          justify-content: center;
          color: #666;
          font-size: 0.9rem;
        }
        
        
        @media (max-width: 480px) {
          .play-page {
            padding: 10px;
          }
          
          .game-header h1 {
            font-size: 1.5rem;
          }
          
        .game-info {
          flex-direction: column;
          gap: 5px;
        }
        
        .input-status {
          text-align: center;
          margin: 16px 0;
          padding: 8px;
          background-color: #f0f9ff;
          border: 1px solid #0ea5e9;
          border-radius: 6px;
          color: #0369a1;
          font-weight: 500;
        }
        
        }
      `}</style>
    </div>
  );
}

// 메인 PlayPage 컴포넌트
export default function PlayPage() {
  const params = useParams();
  const deckId = params.deckId as string;

  return (
    <Suspense fallback={<Loading />}>
      <GameLoader deckId={deckId} />
    </Suspense>
  );
}
