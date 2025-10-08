"use client";

import { GameState } from "@/lib/wordleGame";

interface WordleGridProps {
  gameState: GameState;
  showResult?: boolean;
}

export function WordleGrid({ gameState, showResult = false }: WordleGridProps) {
  const { targetWord, guesses, currentGuess } = gameState;
  const wordLength = targetWord.length;
  const maxGuesses = gameState.maxGuesses;
  const currentRowIndex = guesses.length;
  
  // 6줄 × n글자 그리드 생성
  const rows = [];
  
  for (let rowIndex = 0; rowIndex < maxGuesses; rowIndex++) {
    const isCurrentRow = rowIndex === currentRowIndex && gameState.gameStatus === 'playing';
    const isCompletedRow = rowIndex < guesses.length;
    
    rows.push(
      <div key={`row-${rowIndex}`} className={`wordle-row ${isCurrentRow ? 'current-row' : ''}`}>
        {Array.from({ length: wordLength }, (_, letterIndex) => {
          let tileContent = '';
          let tileState = '';
          
          if (isCompletedRow) {
            // 완료된 추측의 타일
            const letter = guesses[rowIndex].letters[letterIndex];
            tileContent = letter.char.toUpperCase();
            tileState = letter.state;
          } else if (isCurrentRow) {
            // 현재 입력 중인 추측의 타일
            tileContent = currentGuess[letterIndex]?.toUpperCase() || '';
            tileState = tileContent ? 'filled' : '';
          }
          
          return (
            <div
              key={`${rowIndex}-${letterIndex}`}
              className={`wordle-tile ${tileState} ${showResult && isCompletedRow ? 'revealed' : ''}`}
            >
              {tileContent}
            </div>
          );
        })}
      </div>
    );
  }
  
  return (
    <>
      <style jsx global>{`
        .wordle-grid {
          display: flex;
          flex-direction: column;
          gap: 5px;
          max-width: 350px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .wordle-row {
          display: flex;
          gap: 5px;
          justify-content: center;
        }
        
        .wordle-row.current-row {
          animation: row-highlight 2s ease-in-out infinite;
        }
        
        .wordle-tile {
          width: 62px;
          height: 62px;
          border: 2px solid #d3d6da;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 2rem;
          text-transform: uppercase;
          transition: all 0.3s ease;
          background-color: #fff;
          color: #000;
        }
        
        .wordle-tile.filled {
          border-color: #878a8c;
          animation: tile-pop 0.2s ease;
        }
        
        .wordle-tile.correct {
          background-color: #6aaa64;
          border-color: #6aaa64;
          color: #fff;
        }
        
        .wordle-tile.present {
          background-color: #c9b458;
          border-color: #c9b458;
          color: #fff;
        }
        
        .wordle-tile.absent {
          background-color: #787c7e;
          border-color: #787c7e;
          color: #fff;
        }
        
        .wordle-tile.revealed {
          animation: tile-reveal 0.6s ease;
        }
        
        @keyframes tile-pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        
        @keyframes tile-reveal {
          0% { 
            transform: rotateX(0deg);
          }
          50% { 
            transform: rotateX(90deg);
          }
          100% { 
            transform: rotateX(0deg);
          }
        }
        
        @keyframes row-highlight {
          0%, 100% { 
            opacity: 1;
          }
          50% { 
            opacity: 0.7;
          }
        }
        
        @media (max-width: 480px) {
          .wordle-grid {
            padding: 10px;
            max-width: 280px;
          }
          
          .wordle-tile {
            width: 50px;
            height: 50px;
            font-size: 1.5rem;
          }
        }
      `}</style>
      <div className="wordle-grid">
        {rows}
      </div>
    </>
  );
}
