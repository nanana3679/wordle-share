// 순수 Wordle 게임 엔진.
//
// 기존 lib/wordleGame.ts 의 상태 함수들은 호출마다 getScriptAdapter()를 다시
// 조회했다. GameEngine 은 initialize() 시점에 어댑터를 단 한 번 해석해 보관하고,
// 이후 모든 연산에서 재사용한다. React 에 의존하지 않으므로 마운트 없이 테스트할 수 있다.
//
// 게임 UI 훅/컴포넌트는 이 엔진 위에 키보드 이벤트 + UI 상태만 얇게 얹는다.

import { getScriptAdapter } from './scripts';
import type { ScriptAdapter, ScriptId } from './scripts/types';
import {
  evaluateGuess,
  type GameState,
  type Guess,
  type LetterState,
} from './wordleGame';

export type { GameState, Guess, Letter, LetterState } from './wordleGame';

export interface SubmitResult {
  engine: GameEngine;
  /** 이번 제출에서 추가된 판정 행. 길이 불일치/검증 실패 등으로 제출이 거부되면 null. */
  result: Guess | null;
  /** 제출이 거부된 경우의 사유 메시지(있으면). */
  errorMessage?: string;
}

/**
 * 불변(immutable) 게임 엔진. 각 연산은 새 GameEngine 인스턴스를 반환하며,
 * 어댑터는 인스턴스 생성 시 주입되어 연산마다 재조회하지 않는다.
 */
export class GameEngine {
  readonly state: GameState;
  private readonly adapter: ScriptAdapter;

  private constructor(state: GameState, adapter: ScriptAdapter) {
    this.state = state;
    this.adapter = adapter;
  }

  /**
   * 게임을 초기화한다. 스크립트 어댑터는 여기서 한 번만 해석된다.
   *
   * @param targetWord 정답 단어
   * @param adapterId  스크립트 id (예: 'latin', 'hangul')
   * @param options    maxGuesses(기본 6), validWords(유효 단어 목록)
   */
  static initialize(
    targetWord: string,
    adapterId: ScriptId,
    options?: { maxGuesses?: number; validWords?: string[] },
  ): GameEngine {
    const adapter = getScriptAdapter(adapterId);
    const state: GameState = {
      targetWord: adapter.normalize(targetWord),
      guesses: [],
      currentGuess: '',
      gameStatus: 'playing',
      maxGuesses: options?.maxGuesses ?? 6,
      keyboardState: {},
      validWords: options?.validWords?.map((w) => adapter.normalize(w)),
      errorMessage: undefined,
      adapterId: adapter.id,
    };
    return new GameEngine(state, adapter);
  }

  /**
   * 기존 GameState 로부터 엔진을 복원한다. (직렬화/서버 hydration 용)
   * adapterId 로 어댑터를 한 번 재해석한다.
   */
  static fromState(state: GameState): GameEngine {
    return new GameEngine(state, getScriptAdapter(state.adapterId));
  }

  /** 현재 글자 수가 정답 길이에 도달했는지. */
  get isGuessFull(): boolean {
    return (
      this.adapter.splitUnits(this.state.currentGuess).length >=
      this.adapter.splitUnits(this.state.targetWord).length
    );
  }

  get isComplete(): boolean {
    return this.state.gameStatus === 'won' || this.state.gameStatus === 'lost';
  }

  /** 입력 줄에 글자를 추가한다. 거부되면 동일 인스턴스를 반환한다. */
  addLetter(letter: string): GameEngine {
    if (this.state.gameStatus !== 'playing') return this;

    const targetUnits = this.adapter.splitUnits(this.state.targetWord);
    const currentUnits = this.adapter.splitUnits(this.state.currentGuess);
    if (currentUnits.length >= targetUnits.length) return this;
    if (!this.adapter.isAllowedChar(letter)) return this;

    return this.withState({
      currentGuess: this.state.currentGuess + this.adapter.normalizeChar(letter),
      errorMessage: undefined, // 입력 시 에러 메시지 초기화
    });
  }

  /** 입력 줄의 마지막 글자를 제거한다. */
  removeLetter(): GameEngine {
    if (this.state.gameStatus !== 'playing') return this;

    const units = this.adapter.splitUnits(this.state.currentGuess);
    if (units.length === 0) return this;

    return this.withState({ currentGuess: units.slice(0, -1).join('') });
  }

  /** 입력 줄 전체를 한 번에 설정한다. (free-text 입력 시뮬레이터용) */
  setGuess(guess: string): GameEngine {
    if (this.state.gameStatus !== 'playing') return this;
    return this.withState({
      currentGuess: this.adapter.normalize(guess),
      errorMessage: undefined,
    });
  }

  /**
   * 현재 입력 줄을 제출해 판정한다.
   * @returns 새 엔진과 이번에 추가된 판정 행(result). 거부되면 result 는 null.
   */
  submitGuess(): SubmitResult {
    const { state, adapter } = this;
    if (state.gameStatus !== 'playing') {
      return { engine: this, result: null };
    }

    const targetUnits = adapter.splitUnits(state.targetWord);
    const currentUnits = adapter.splitUnits(state.currentGuess);
    if (currentUnits.length !== targetUnits.length) {
      return { engine: this, result: null };
    }

    // 유효한 단어 목록이 있는 경우 검증
    if (state.validWords && state.validWords.length > 0) {
      const currentNormalized = adapter.normalize(state.currentGuess);
      if (!state.validWords.includes(currentNormalized)) {
        const errorMessage = '단어 목록에 없는 단어입니다.';
        return {
          engine: this.withState({ errorMessage }),
          result: null,
          errorMessage,
        };
      }
    }

    const newGuess = evaluateGuess(currentUnits, targetUnits);
    const newGuesses = [...state.guesses, newGuess];

    // 키보드 상태 업데이트 (correct > present > absent 우선순위, 강등 금지)
    const newKeyboardState: Record<string, LetterState> = { ...state.keyboardState };
    newGuess.letters.forEach((letter) => {
      if (letter.char && letter.state !== 'empty') {
        const keyId = adapter.keyId(letter.char);
        const currentState = newKeyboardState[keyId];
        if (
          !currentState ||
          (currentState === 'absent' && letter.state !== 'absent') ||
          (currentState === 'present' && letter.state === 'correct')
        ) {
          newKeyboardState[keyId] = letter.state;
        }
      }
    });

    // 게임 상태 확인
    let gameStatus: GameState['gameStatus'] = 'playing';
    if (adapter.normalize(state.currentGuess) === state.targetWord) {
      gameStatus = 'won';
    } else if (newGuesses.length >= state.maxGuesses) {
      gameStatus = 'lost';
    }

    return {
      engine: this.withState({
        guesses: newGuesses,
        currentGuess: '', // 다음 줄로 넘어가기 위해 초기화
        gameStatus,
        keyboardState: newKeyboardState,
        errorMessage: undefined,
      }),
      result: newGuess,
    };
  }

  private withState(patch: Partial<GameState>): GameEngine {
    return new GameEngine({ ...this.state, ...patch }, this.adapter);
  }
}
