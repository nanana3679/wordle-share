// Wordle 게임 로직

import { getScriptAdapter } from './scripts';
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

export function initializeGame(
  targetWord: string,
  maxGuesses: number = 6,
  validWords: string[] | undefined,
  adapter: ScriptAdapter
): GameState {
  return {
    targetWord: adapter.normalize(targetWord),
    guesses: [],
    currentGuess: '',
    gameStatus: 'playing',
    maxGuesses,
    keyboardState: {},
    validWords: validWords?.map((w) => adapter.normalize(w)),
    errorMessage: undefined,
    adapterId: adapter.id,
  };
}

export function addLetterToGuess(gameState: GameState, letter: string): GameState {
  if (gameState.gameStatus !== 'playing') return gameState;

  const adapter = getScriptAdapter(gameState.adapterId);
  const targetUnits = adapter.splitUnits(gameState.targetWord);
  const currentUnits = adapter.splitUnits(gameState.currentGuess);
  if (currentUnits.length >= targetUnits.length) return gameState;

  if (!adapter.isAllowedChar(letter)) return gameState;

  return {
    ...gameState,
    currentGuess: gameState.currentGuess + adapter.normalize(letter),
    errorMessage: undefined // 입력 시 에러 메시지 초기화
  };
}

export function removeLetterFromGuess(gameState: GameState): GameState {
  if (gameState.gameStatus !== 'playing') return gameState;

  const adapter = getScriptAdapter(gameState.adapterId);
  const units = adapter.splitUnits(gameState.currentGuess);
  if (units.length === 0) return gameState;

  return {
    ...gameState,
    currentGuess: units.slice(0, -1).join('')
  };
}

export function submitGuess(gameState: GameState): GameState {
  if (gameState.gameStatus !== 'playing') return gameState;

  const adapter = getScriptAdapter(gameState.adapterId);
  const targetUnits = adapter.splitUnits(gameState.targetWord);
  const currentUnits = adapter.splitUnits(gameState.currentGuess);
  if (currentUnits.length !== targetUnits.length) return gameState;

  // 유효한 단어 목록이 있는 경우 검증
  if (gameState.validWords && gameState.validWords.length > 0) {
    const currentNormalized = adapter.normalize(gameState.currentGuess);
    if (!gameState.validWords.includes(currentNormalized)) {
      return {
        ...gameState,
        errorMessage: '단어 목록에 없는 단어입니다.'
      };
    }
  }

  const newGuess = evaluateGuess(currentUnits, targetUnits);
  const newGuesses = [...gameState.guesses, newGuess];

  // 키보드 상태 업데이트
  const newKeyboardState = { ...gameState.keyboardState };
  newGuess.letters.forEach(letter => {
    if (letter.char && letter.state !== 'empty') {
      // 키보드에서는 대문자로 저장 (키보드 배열이 대문자이므로)
      const upperChar = letter.char.toUpperCase();
      // 더 높은 우선순위 상태로 업데이트 (correct > present > absent)
      const currentState = newKeyboardState[upperChar];
      if (!currentState ||
          (currentState === 'absent' && letter.state !== 'absent') ||
          (currentState === 'present' && letter.state === 'correct')) {
        newKeyboardState[upperChar] = letter.state;
      }
    }
  });

  // 게임 상태 확인
  let gameStatus: 'playing' | 'won' | 'lost' = 'playing';
  if (adapter.normalize(gameState.currentGuess) === gameState.targetWord) {
    gameStatus = 'won';
  } else if (newGuesses.length >= gameState.maxGuesses) {
    gameStatus = 'lost';
  }

  return {
    ...gameState,
    guesses: newGuesses,
    currentGuess: '', // 다음 줄로 넘어가기 위해 초기화
    gameStatus,
    keyboardState: newKeyboardState,
    errorMessage: undefined
  };
}

function evaluateGuess(guessUnits: string[], targetUnits: string[]): Guess {
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
