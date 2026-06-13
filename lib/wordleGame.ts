// Wordle 게임 공유 타입 + 판정 프리미티브.
//
// 상태 머신(글자 입력/제출/승패)은 lib/gameEngine.ts 의 GameEngine 으로 이전되었다.
// 이 모듈은 다음만 보유한다:
//  - 공유 타입(LetterState/Letter/Guess/GameState) — 컴포넌트/서버 액션이 광범위하게 import
//  - evaluateGuess — 서버측 데일리/챌린지 판정(app/actions)에서 직접 사용하는 프리미티브
//  - selectRandomWord
//  - GameEngine 으로 위임하는 하위호환 래퍼(@deprecated)
//
// GameEngine 은 evaluateGuess/타입을 이 모듈에서 import 하므로, 아래 래퍼는
// 순환 참조를 피하기 위해 함수 호출 시점에 동적으로 GameEngine 을 가져온다.

import { GameEngine } from './gameEngine';
import type { ScriptAdapter, ScriptId } from './scripts/types';

export type LetterState = 'correct' | 'present' | 'absent' | 'empty';

export interface Letter {
  char: string;
  state: LetterState;
}

export interface Guess {
  letters: Letter[];
}

export interface GameState {
  targetWord: string;
  guesses: Guess[];
  currentGuess: string;
  gameStatus: 'playing' | 'won' | 'lost';
  maxGuesses: number;
  keyboardState: Record<string, LetterState>;
  validWords?: string[]; // 유효한 단어 목록
  errorMessage?: string; // 에러 메시지
  adapterId: ScriptId;
}

/**
 * @deprecated GameEngine.initialize(targetWord, adapter.id, { maxGuesses, validWords }) 를 사용하라.
 * 호출마다 어댑터를 받지만 GameEngine 은 id 로 한 번만 해석한다.
 */
export function initializeGame(
  targetWord: string,
  maxGuesses: number = 6,
  validWords: string[] | undefined,
  adapter: ScriptAdapter
): GameState {
  return GameEngine.initialize(targetWord, adapter.id, { maxGuesses, validWords }).state;
}

/** @deprecated GameEngine.fromState(state).addLetter(letter).state 를 사용하라. */
export function addLetterToGuess(gameState: GameState, letter: string): GameState {
  return GameEngine.fromState(gameState).addLetter(letter).state;
}

/** @deprecated GameEngine.fromState(state).removeLetter().state 를 사용하라. */
export function removeLetterFromGuess(gameState: GameState): GameState {
  return GameEngine.fromState(gameState).removeLetter().state;
}

/** @deprecated GameEngine.fromState(state).submitGuess().engine.state 를 사용하라. */
export function submitGuess(gameState: GameState): GameState {
  return GameEngine.fromState(gameState).submitGuess().engine.state;
}

// 서버측 데일리 판정(app/actions/daily.ts)에서도 사용하므로 export한다
export function evaluateGuess(guessUnits: string[], targetUnits: string[]): Guess {
  const result: Letter[] = [];

  // 첫 번째 패스: 정확한 위치의 글자 확인
  const targetRemaining = [...targetUnits];
  const guessRemaining = [...guessUnits];

  // correct 위치 찾기
  for (let i = 0; i < guessUnits.length; i++) {
    if (guessUnits[i] === targetUnits[i]) {
      result[i] = { char: guessUnits[i], state: 'correct' };
      targetRemaining[i] = '';
      guessRemaining[i] = '';
    }
  }

  // 두 번째 패스: present 위치 찾기
  for (let i = 0; i < guessUnits.length; i++) {
    if (guessRemaining[i] === '') continue; // 이미 처리된 글자

    const targetIndex = targetRemaining.findIndex((char) => char === guessUnits[i]);
    if (targetIndex !== -1) {
      result[i] = { char: guessUnits[i], state: 'present' };
      targetRemaining[targetIndex] = '';
      guessRemaining[i] = '';
    }
  }

  // 세 번째 패스: absent 처리
  for (let i = 0; i < guessUnits.length; i++) {
    if (guessRemaining[i] === '') continue; // 이미 처리된 글자
    result[i] = { char: guessUnits[i], state: 'absent' };
  }

  return { letters: result };
}

export function selectRandomWord(words: string[]): string {
  if (words.length === 0) throw new Error('단어 목록이 비어있습니다.');
  const randomIndex = Math.floor(Math.random() * words.length);
  return words[randomIndex];
}

export function isGameComplete(gameState: GameState): boolean {
  return gameState.gameStatus === 'won' || gameState.gameStatus === 'lost';
}
