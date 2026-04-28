"use client";

import { LetterState } from "@/lib/wordleGame";
import type { ScriptAdapter } from "@/lib/scripts/types";

interface KeyboardProps {
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
  keyboardState: Record<string, LetterState>;
  adapter: ScriptAdapter;
  disabled?: boolean;
}

export function WordleKeyboard({
  onKeyPress,
  onBackspace,
  onEnter,
  keyboardState,
  adapter,
  disabled = false
}: KeyboardProps) {
  const layout = adapter.keyboard;

  const getKeyClassName = (key: string): string => {
    const baseClass = "keyboard-key";

    if (key === layout.enterLabel || key === layout.backspaceLabel) {
      return `${baseClass} special-key ${disabled ? 'disabled' : ''}`;
    }

    const state = keyboardState[adapter.keyId(key)];

    let stateClass = '';
    if (state === 'correct') stateClass = 'correct';
    else if (state === 'present') stateClass = 'present';
    else if (state === 'absent') stateClass = 'absent';

    return `${baseClass} ${stateClass} ${disabled ? 'disabled' : ''}`;
  };

  const handleKeyClick = (key: string) => {
    if (disabled) return;

    if (key === layout.enterLabel) {
      onEnter();
    } else if (key === layout.backspaceLabel) {
      onBackspace();
    } else {
      onKeyPress(key);
    }
  };

  return (
    <>
      <style jsx global>{`
        .keyboard-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-width: 500px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .keyboard-row {
          display: flex;
          gap: 6px;
          justify-content: center;
        }
        
        .keyboard-key {
          min-width: 40px;
          height: 58px;
          border: none;
          border-radius: 4px;
          font-weight: bold;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          user-select: none;
          background-color: #d3d6da;
          color: #000;
        }
        
        .keyboard-key:hover:not(.disabled) {
          background-color: #b8bcc0;
        }
        
        .keyboard-key:active:not(.disabled) {
          transform: scale(0.95);
        }
        
        .special-key {
          min-width: 65px;
          font-size: 12px;
          background-color: #818384;
          color: #fff;
        }
        
        .special-key:hover:not(.disabled) {
          background-color: #6a6d6f;
        }
        
        .keyboard-key.correct {
          background-color: #6aaa64;
          color: #fff;
        }
        
        .keyboard-key.correct:hover:not(.disabled) {
          background-color: #5a9a54;
        }
        
        .keyboard-key.present {
          background-color: #c9b458;
          color: #fff;
        }
        
        .keyboard-key.present:hover:not(.disabled) {
          background-color: #b9a448;
        }
        
        .keyboard-key.absent {
          background-color: #787c7e;
          color: #fff;
        }
        
        .keyboard-key.absent:hover:not(.disabled) {
          background-color: #686c6e;
        }
        
        .keyboard-key.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        @media (max-width: 480px) {
          .keyboard-container {
            padding: 10px;
          }
          
          .keyboard-key {
            min-width: 30px;
            height: 48px;
            font-size: 12px;
          }
          
          .special-key {
            min-width: 50px;
            font-size: 10px;
          }
        }
      `}</style>
      <div className="keyboard-container">
        {layout.rows.map((row, rowIndex) => (
          <div key={rowIndex} className="keyboard-row">
            {row.map((key) => (
              <button
                key={key}
                className={getKeyClassName(key)}
                onClick={() => handleKeyClick(key)}
                disabled={disabled}
              >
                {key === layout.backspaceLabel ? '⌫' : key}
              </button>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
