// GameEngine: 순수 게임 로직을 캡슐화한 불변 모듈
// getScriptAdapter는 createGameEngine() 호출 시 한 번만 실행됩니다.

import { getScriptAdapter } from './scripts';
import type { ScriptId } from './scripts/types';
import type { Deck } from '@/types/decks';
import { getWordStrings } from './deckHelpers';
import {
  initializeGame,
  selectRandomWord,
  evaluateGuess as _evaluateGuess,
  type GameState,
  type Guess,
  type Letter,
  type LetterState,
} from './wordleGame';

export type { GameState, LetterState, Guess } from './wordleGame';

export type TileState = LetterState;

export type GuessResult =
  | { type: 'invalid'; reason: string }
  | { type: 'correct' }
  | { type: 'wrong'; tileStates: TileState[] }
  | { type: 'game_over' };

export interface GameEngine {
  addLetter(letter: string): GameEngine;
  removeLetter(): GameEngine;
  submitGuess(): { engine: GameEngine; result: GuessResult };
  readonly state: GameState;
}

// 내부 구현: 어댑터 인스턴스를 인스턴스 변수로 고정하여 매 호출마다 재조회하지 않음
class GameEngineImpl implements GameEngine {
  readonly state: GameState;
  private readonly _adapter: ReturnType<typeof getScriptAdapter>;

  constructor(state: GameState, adapter: ReturnType<typeof getScriptAdapter>) {
    this.state = state;
    this._adapter = adapter;
  }

  private get adapter() {
    return this._adapter;
  }

  addLetter(letter: string): GameEngine {
    const { state, adapter } = this;
    if (state.gameStatus !== 'playing') return this;

    const targetUnits = adapter.splitUnits(state.targetWord);
    const currentUnits = adapter.splitUnits(state.currentGuess);
    if (currentUnits.length >= targetUnits.length) return this;
    if (!adapter.isAllowedChar(letter)) return this;

    return new GameEngineImpl({
      ...state,
      currentGuess: state.currentGuess + adapter.normalizeChar(letter),
      errorMessage: undefined,
    }, adapter);
  }

  removeLetter(): GameEngine {
    const { state, adapter } = this;
    if (state.gameStatus !== 'playing') return this;

    const units = adapter.splitUnits(state.currentGuess);
    if (units.length === 0) return this;

    return new GameEngineImpl({
      ...state,
      currentGuess: units.slice(0, -1).join(''),
    }, adapter);
  }

  submitGuess(): { engine: GameEngine; result: GuessResult } {
    const { state, adapter } = this;

    if (state.gameStatus !== 'playing') {
      return { engine: this, result: { type: 'game_over' } };
    }

    const targetUnits = adapter.splitUnits(state.targetWord);
    const currentUnits = adapter.splitUnits(state.currentGuess);

    // 줄 미충족 — invalid (이유 없이 동일 상태 반환)
    if (currentUnits.length !== targetUnits.length) {
      return {
        engine: this,
        result: { type: 'invalid', reason: '' },
      };
    }

    // 유효 단어 검사
    if (state.validWords && state.validWords.length > 0) {
      const normalized = adapter.normalize(state.currentGuess);
      if (!state.validWords.includes(normalized)) {
        const invalidState = { ...state, errorMessage: '단어 목록에 없는 단어입니다.' };
        return {
          engine: new GameEngineImpl(invalidState, adapter),
          result: { type: 'invalid', reason: invalidState.errorMessage },
        };
      }
    }

    // 추측 평가
    const newGuess = _evaluateGuess(currentUnits, targetUnits);
    const newGuesses = [...state.guesses, newGuess];

    // 키보드 상태 업데이트
    const newKeyboardState = { ...state.keyboardState };
    newGuess.letters.forEach((letter: Letter) => {
      if (letter.char && letter.state !== 'empty') {
        const keyId = adapter.keyId(letter.char);
        const current = newKeyboardState[keyId];
        if (
          !current ||
          (current === 'absent' && letter.state !== 'absent') ||
          (current === 'present' && letter.state === 'correct')
        ) {
          newKeyboardState[keyId] = letter.state;
        }
      }
    });

    // 게임 결과 판정
    let gameStatus: GameState['gameStatus'] = 'playing';
    const isCorrect = adapter.normalize(state.currentGuess) === state.targetWord;
    if (isCorrect) {
      gameStatus = 'won';
    } else if (newGuesses.length >= state.maxGuesses) {
      gameStatus = 'lost';
    }

    const newState: GameState = {
      ...state,
      guesses: newGuesses,
      currentGuess: '',
      gameStatus,
      keyboardState: newKeyboardState,
      errorMessage: undefined,
    };

    const nextEngine = new GameEngineImpl(newState, adapter);

    if (isCorrect) {
      return { engine: nextEngine, result: { type: 'correct' } };
    }
    if (gameStatus === 'lost') {
      return { engine: nextEngine, result: { type: 'game_over' } };
    }

    const tileStates = newGuess.letters.map((l: Letter) => l.state);
    return { engine: nextEngine, result: { type: 'wrong', tileStates } };
  }
}

/**
 * 어댑터를 한 번만 조회하여 GameEngine 인스턴스를 생성합니다.
 */
export function createGameEngine(deck: Deck, adapterId: ScriptId): GameEngine {
  const adapter = getScriptAdapter(adapterId);
  const wordList = getWordStrings(deck);
  if (wordList.length === 0) throw new Error('이 덱에는 단어가 없습니다.');

  const targetWord = selectRandomWord(wordList);
  const state = initializeGame(targetWord, 6, wordList, adapter);
  return new GameEngineImpl(state, adapter);
}

/**
 * 기존 GameState로부터 GameEngine을 복원합니다 (테스트나 SSR 직렬화 복원 등에서 활용).
 */
export function createGameEngineFromState(state: GameState): GameEngine {
  const adapter = getScriptAdapter(state.adapterId);
  return new GameEngineImpl(state, adapter);
}

// wordleGame.ts는 파일 유지 — selectRandomWord, initializeGame, evaluateGuess 등 유틸 공유
