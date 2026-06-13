import { describe, it, expect } from 'vitest';
// React 를 마운트하지 않고 순수 엔진을 직접 검증한다.
import { GameEngine } from '../gameEngine';
import { getScriptAdapter } from '../scripts';
import type { LetterState } from '../wordleGame';

const latin = getScriptAdapter('latin');
const hangul = getScriptAdapter('hangul');

function createEngine(
  targetWord: string,
  options?: { validWords?: string[]; maxGuesses?: number; adapter?: 'latin' | 'hangul' },
): GameEngine {
  return GameEngine.initialize(targetWord, options?.adapter ?? 'latin', {
    maxGuesses: options?.maxGuesses,
    validWords: options?.validWords,
  });
}

/** 글자열을 차례로 입력해 엔진을 진행시킨다. */
function typeWord(engine: GameEngine, word: string): GameEngine {
  let e = engine;
  for (const ch of word) e = e.addLetter(ch);
  return e;
}

function lastRowStates(engine: GameEngine): LetterState[] {
  const guesses = engine.state.guesses;
  return guesses[guesses.length - 1].letters.map((l) => l.state);
}

describe('GameEngine.initialize', () => {
  it('대상 단어와 유효 단어 목록을 정규화한다 (latin: 소문자화)', () => {
    const engine = createEngine('CRANE', { validWords: ['CRANE', 'Slate'] });
    expect(engine.state.targetWord).toBe('crane');
    expect(engine.state.validWords).toEqual(['crane', 'slate']);
  });

  it('초기 상태가 비어 있다', () => {
    const { state } = createEngine('crane');
    expect(state.guesses).toEqual([]);
    expect(state.currentGuess).toBe('');
    expect(state.gameStatus).toBe('playing');
    expect(state.keyboardState).toEqual({});
    expect(state.errorMessage).toBeUndefined();
    expect(state.adapterId).toBe('latin');
    expect(state.maxGuesses).toBe(6);
  });

  it('초기 GameEngine 은 isComplete = false 이다', () => {
    expect(createEngine('crane').isComplete).toBe(false);
  });
});

describe('GameEngine.addLetter', () => {
  it('허용 문자를 정규화해 추가한다', () => {
    expect(createEngine('crane').addLetter('C').state.currentGuess).toBe('c');
  });

  it('대상 단어 길이에 도달하면 더 추가하지 않는다', () => {
    const engine = typeWord(createEngine('cat'), 'cats');
    expect(engine.state.currentGuess).toBe('cat');
    expect(engine.isGuessFull).toBe(true);
  });

  it('허용되지 않는 문자는 무시한다', () => {
    expect(createEngine('crane').addLetter('1').state.currentGuess).toBe('');
  });

  it('게임이 끝난 상태에서는 동일 인스턴스를 반환한다', () => {
    // 1회 시도 게임에서 정답을 맞혀 won 상태로 만든 뒤
    const won = typeWord(createEngine('crane', { maxGuesses: 1 }), 'crane').submitGuess().engine;
    expect(won.state.gameStatus).toBe('won');
    expect(won.addLetter('a')).toBe(won);
  });

  it('입력 시 에러 메시지를 초기화한다', () => {
    // 잘못된 단어를 제출해 errorMessage 를 만든 뒤 글자 입력
    const withError = typeWord(
      createEngine('crane', { validWords: ['crane'] }),
      'zzzzz',
    ).submitGuess().engine;
    expect(withError.state.errorMessage).toBe('단어 목록에 없는 단어입니다.');
    // 한 글자 지우고 다시 입력하면 에러 초기화
    expect(withError.removeLetter().addLetter('a').state.errorMessage).toBeUndefined();
  });

  it('연산은 불변이다 — 원본 엔진은 변하지 않는다', () => {
    const base = createEngine('crane');
    const next = base.addLetter('c');
    expect(base.state.currentGuess).toBe('');
    expect(next.state.currentGuess).toBe('c');
    expect(next).not.toBe(base);
  });
});

describe('GameEngine.removeLetter', () => {
  it('마지막 글자를 제거한다', () => {
    const engine = typeWord(createEngine('crane'), 'cra').removeLetter();
    expect(engine.state.currentGuess).toBe('cr');
  });

  it('빈 입력에서는 동일 인스턴스를 반환한다', () => {
    const engine = createEngine('crane');
    expect(engine.removeLetter()).toBe(engine);
  });

  it('한글은 자모 단위로 제거한다 (이중모음은 입력 자모 2개로 분해)', () => {
    // '사과' = ㅅㅏㄱㅗㅏ → 마지막 입력 자모 ㅏ만 제거되어 ㅅㅏㄱㅗ
    const engine = typeWord(createEngine('사과', { adapter: 'hangul' }), '사과').removeLetter();
    expect(hangul.splitUnits(engine.state.currentGuess)).toEqual(['ㅅ', 'ㅏ', 'ㄱ', 'ㅗ']);
  });
});

describe('GameEngine.submitGuess — 판정 (correct/present/absent)', () => {
  it('정답이면 모두 correct이고 게임에서 승리한다', () => {
    const { engine, result } = typeWord(createEngine('crane'), 'crane').submitGuess();
    expect(result?.letters.map((l) => l.state)).toEqual([
      'correct',
      'correct',
      'correct',
      'correct',
      'correct',
    ]);
    expect(engine.state.gameStatus).toBe('won');
    expect(engine.state.currentGuess).toBe('');
    expect(engine.isComplete).toBe(true);
  });

  it('위치가 다른 글자는 present로 판정한다', () => {
    const engine = typeWord(createEngine('abbey'), 'babes').submitGuess().engine;
    expect(lastRowStates(engine)).toEqual(['present', 'present', 'correct', 'correct', 'absent']);
  });

  it('중복 글자는 타깃에 남은 개수만큼만 present 처리한다', () => {
    const engine = typeWord(createEngine('abbey'), 'kebab').submitGuess().engine;
    expect(lastRowStates(engine)).toEqual(['absent', 'present', 'correct', 'present', 'present']);
  });

  it('한글은 자모 단위로 판정한다 (이중모음 분해 포함)', () => {
    // 타깃 사과(ㅅㅏㄱㅗㅏ) vs 추측 과자(ㄱㅗㅏㅈㅏ)
    // idx4 ㅏ→correct, ㄱ·ㅗ·ㅏ→present, ㅈ→absent
    const engine = typeWord(createEngine('사과', { adapter: 'hangul' }), '과자').submitGuess().engine;
    expect(lastRowStates(engine)).toEqual(['present', 'present', 'present', 'absent', 'correct']);
  });

  it('길이가 다르면 제출되지 않고 result 는 null 이다', () => {
    const { engine, result } = typeWord(createEngine('crane'), 'cat').submitGuess();
    expect(result).toBeNull();
    expect(engine.state.guesses).toHaveLength(0);
  });
});

describe('GameEngine.submitGuess — 유효 단어 검증', () => {
  it('목록에 없는 단어는 errorMessage 를 남기고 제출하지 않는다', () => {
    const { engine, result, errorMessage } = typeWord(
      createEngine('crane', { validWords: ['crane', 'slate'] }),
      'zzzzz',
    ).submitGuess();
    expect(result).toBeNull();
    expect(errorMessage).toBe('단어 목록에 없는 단어입니다.');
    expect(engine.state.guesses).toHaveLength(0);
    expect(engine.state.errorMessage).toBe('단어 목록에 없는 단어입니다.');
    // 입력은 보존된다(사용자가 수정할 수 있도록)
    expect(engine.state.currentGuess).toBe('zzzzz');
  });

  it('목록에 있는 단어는 정규화 후 비교해 통과한다', () => {
    const { engine, result } = typeWord(
      createEngine('crane', { validWords: ['crane', 'slate'] }),
      'slate',
    ).submitGuess();
    expect(result).not.toBeNull();
    expect(engine.state.guesses).toHaveLength(1);
    expect(engine.state.errorMessage).toBeUndefined();
  });
});

describe('GameEngine.submitGuess — 게임 상태 전이', () => {
  it('maxGuesses 도달 시 패배한다', () => {
    let engine = createEngine('crane', { maxGuesses: 2 });
    engine = typeWord(engine, 'slate').submitGuess().engine;
    expect(engine.state.gameStatus).toBe('playing');
    engine = typeWord(engine, 'slate').submitGuess().engine;
    expect(engine.state.gameStatus).toBe('lost');
    expect(engine.state.guesses).toHaveLength(2);
    expect(engine.isComplete).toBe(true);
  });

  it('마지막 시도에서 정답이면 승리한다', () => {
    const engine = typeWord(createEngine('crane', { maxGuesses: 1 }), 'crane').submitGuess().engine;
    expect(engine.state.gameStatus).toBe('won');
  });

  it('게임이 끝난 뒤 submitGuess 는 동일 인스턴스 + null result 를 반환한다', () => {
    const won = typeWord(createEngine('crane', { maxGuesses: 1 }), 'crane').submitGuess().engine;
    const after = won.submitGuess();
    expect(after.engine).toBe(won);
    expect(after.result).toBeNull();
  });
});

describe('GameEngine.submitGuess — 키보드 상태', () => {
  it('correct > present > absent 우선순위로 갱신하고 강등하지 않는다', () => {
    let engine = createEngine('crane');
    engine = typeWord(engine, 'beach').submitGuess().engine; // e: present, b: absent
    expect(engine.state.keyboardState[latin.keyId('e')]).toBe('present');
    expect(engine.state.keyboardState[latin.keyId('b')]).toBe('absent');
    engine = typeWord(engine, 'slate').submitGuess().engine; // e: correct 로 승급
    expect(engine.state.keyboardState[latin.keyId('e')]).toBe('correct');
    engine = typeWord(engine, 'beach').submitGuess().engine; // present 나와도 correct 유지
    expect(engine.state.keyboardState[latin.keyId('e')]).toBe('correct');
  });
});

describe('GameEngine.fromState', () => {
  it('직렬화된 state 를 복원해 연산을 이어간다', () => {
    const original = typeWord(createEngine('crane'), 'cr');
    const restored = GameEngine.fromState(original.state);
    expect(restored.state).toEqual(original.state);
    expect(restored.addLetter('a').state.currentGuess).toBe('cra');
  });
});

describe('GameEngine.setGuess (free-text 입력)', () => {
  it('입력 줄 전체를 정규화해 설정한다', () => {
    const engine = createEngine('crane').setGuess('CRANE');
    expect(engine.state.currentGuess).toBe('crane');
  });

  it('설정 후 제출까지 한 번에 진행할 수 있다', () => {
    const { engine, result } = createEngine('crane').setGuess('crane').submitGuess();
    expect(result).not.toBeNull();
    expect(engine.state.gameStatus).toBe('won');
  });
});
