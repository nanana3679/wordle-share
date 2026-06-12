import { describe, it, expect } from 'vitest';
import {
  initializeGame,
  addLetterToGuess,
  removeLetterFromGuess,
  submitGuess,
  selectRandomWord,
  isGameComplete,
  type GameState,
  type LetterState,
} from '../wordleGame';
import { getScriptAdapter } from '../scripts';

const latin = getScriptAdapter('latin');
const hangul = getScriptAdapter('hangul');

function createGame(
  targetWord: string,
  options?: { validWords?: string[]; maxGuesses?: number; adapter?: typeof latin }
): GameState {
  const adapter = options?.adapter ?? latin;
  return initializeGame(targetWord, options?.maxGuesses ?? 6, options?.validWords, adapter);
}

function withGuess(state: GameState, guess: string): GameState {
  return { ...state, currentGuess: guess };
}

function states(state: GameState, row: number): LetterState[] {
  return state.guesses[row].letters.map((l) => l.state);
}

describe('initializeGame', () => {
  it('대상 단어와 유효 단어 목록을 정규화한다 (latin: 소문자화)', () => {
    const state = createGame('CRANE', { validWords: ['CRANE', 'Slate'] });
    expect(state.targetWord).toBe('crane');
    expect(state.validWords).toEqual(['crane', 'slate']);
  });

  it('초기 상태가 비어 있다', () => {
    const state = createGame('crane');
    expect(state.guesses).toEqual([]);
    expect(state.currentGuess).toBe('');
    expect(state.gameStatus).toBe('playing');
    expect(state.keyboardState).toEqual({});
    expect(state.errorMessage).toBeUndefined();
    expect(state.adapterId).toBe('latin');
  });
});

describe('addLetterToGuess', () => {
  it('허용 문자를 정규화해 추가한다', () => {
    const state = addLetterToGuess(createGame('crane'), 'C');
    expect(state.currentGuess).toBe('c');
  });

  it('대상 단어 길이에 도달하면 더 추가하지 않는다', () => {
    let state = createGame('cat');
    for (const ch of 'cats') state = addLetterToGuess(state, ch);
    expect(state.currentGuess).toBe('cat');
  });

  it('허용되지 않는 문자는 무시한다', () => {
    const state = addLetterToGuess(createGame('crane'), '1');
    expect(state.currentGuess).toBe('');
  });

  it('게임이 끝난 상태에서는 무시한다', () => {
    const state: GameState = { ...createGame('crane'), gameStatus: 'won' };
    expect(addLetterToGuess(state, 'a')).toBe(state);
  });

  it('입력 시 에러 메시지를 초기화한다', () => {
    const state: GameState = { ...createGame('crane'), errorMessage: '에러' };
    expect(addLetterToGuess(state, 'a').errorMessage).toBeUndefined();
  });
});

describe('removeLetterFromGuess', () => {
  it('마지막 글자를 제거한다', () => {
    const state = removeLetterFromGuess(withGuess(createGame('crane'), 'cra'));
    expect(state.currentGuess).toBe('cr');
  });

  it('빈 입력에서는 상태를 유지한다', () => {
    const state = createGame('crane');
    expect(removeLetterFromGuess(state)).toBe(state);
  });

  it('한글은 자모 단위로 제거한다 (복합 모음은 한 단위)', () => {
    // '사과' = ㅅㅏㄱㅘ → 마지막 자모 ㅘ만 제거되어 ㅅㅏㄱ
    const state = removeLetterFromGuess(
      withGuess(createGame('사과', { adapter: hangul }), '사과')
    );
    expect(hangul.splitUnits(state.currentGuess)).toEqual(['ㅅ', 'ㅏ', 'ㄱ']);
  });
});

describe('submitGuess — 판정 (correct/present/absent)', () => {
  it('정답이면 모두 correct이고 게임에서 승리한다', () => {
    const state = submitGuess(withGuess(createGame('crane'), 'crane'));
    expect(states(state, 0)).toEqual(['correct', 'correct', 'correct', 'correct', 'correct']);
    expect(state.gameStatus).toBe('won');
    expect(state.currentGuess).toBe('');
  });

  it('위치가 다른 글자는 present로 판정한다', () => {
    // 타깃 abbey vs 추측 babes
    const state = submitGuess(withGuess(createGame('abbey'), 'babes'));
    expect(states(state, 0)).toEqual(['present', 'present', 'correct', 'correct', 'absent']);
  });

  it('중복 글자는 타깃에 남은 개수만큼만 present 처리한다', () => {
    // 타깃 abbey(b 2개) vs 추측 kebab: idx2의 b는 correct,
    // idx4의 b는 남은 b 1개를 소비해 present
    const state = submitGuess(withGuess(createGame('abbey'), 'kebab'));
    expect(states(state, 0)).toEqual(['absent', 'present', 'correct', 'present', 'present']);
  });

  it('타깃에 1개뿐인 글자를 2번 추측하면 두 번째는 absent', () => {
    // 타깃 crane(a 1개) vs 추측 araea → idx1의 r... a 소비 검증용
    const state = submitGuess(withGuess(createGame('crane'), 'aanee'));
    // idx0 a: present (타깃 a는 idx2), idx1 a: absent (a 소진),
    // idx2 n: present, idx3 e: absent (e는 idx4에서 correct로 소비), idx4 e: correct
    expect(states(state, 0)).toEqual(['present', 'absent', 'present', 'absent', 'correct']);
  });

  it('길이가 다르면 제출되지 않는다', () => {
    const state = submitGuess(withGuess(createGame('crane'), 'cat'));
    expect(state.guesses).toHaveLength(0);
  });

  it('한글은 자모 단위로 판정한다', () => {
    // 타깃 사과(ㅅㅏㄱㅘ) vs 추측 과자(ㄱㅘㅈㅏ)
    // ㄱ→present(idx2), ㅘ→present(idx3), ㅈ→absent, ㅏ→present(idx1)
    const state = submitGuess(withGuess(createGame('사과', { adapter: hangul }), '과자'));
    expect(states(state, 0)).toEqual(['present', 'present', 'absent', 'present']);
  });
});

describe('submitGuess — 유효 단어 검증', () => {
  it('단어 목록에 없는 단어는 에러 메시지를 남기고 제출하지 않는다', () => {
    const game = createGame('crane', { validWords: ['crane', 'slate'] });
    const state = submitGuess(withGuess(game, 'zzzzz'));
    expect(state.guesses).toHaveLength(0);
    expect(state.errorMessage).toBe('단어 목록에 없는 단어입니다.');
    expect(state.currentGuess).toBe('zzzzz');
  });

  it('목록에 있는 단어는 정규화 후 비교해 통과한다', () => {
    const game = createGame('crane', { validWords: ['crane', 'slate'] });
    const state = submitGuess(withGuess(game, 'SLATE'.toLowerCase()));
    expect(state.guesses).toHaveLength(1);
    expect(state.errorMessage).toBeUndefined();
  });
});

describe('submitGuess — 게임 상태 전이', () => {
  it('maxGuesses 도달 시 패배한다', () => {
    let state = createGame('crane', { maxGuesses: 2 });
    state = submitGuess(withGuess(state, 'slate'));
    expect(state.gameStatus).toBe('playing');
    state = submitGuess(withGuess(state, 'slate'));
    expect(state.gameStatus).toBe('lost');
    expect(state.guesses).toHaveLength(2);
  });

  it('마지막 시도에서 정답이면 승리한다', () => {
    let state = createGame('crane', { maxGuesses: 1 });
    state = submitGuess(withGuess(state, 'crane'));
    expect(state.gameStatus).toBe('won');
  });

  it('게임이 끝난 뒤에는 제출되지 않는다', () => {
    const state: GameState = { ...withGuess(createGame('crane'), 'slate'), gameStatus: 'won' };
    expect(submitGuess(state)).toBe(state);
  });
});

describe('submitGuess — 키보드 상태', () => {
  it('correct > present > absent 우선순위로 갱신하고 강등하지 않는다', () => {
    let state = createGame('crane');
    // e: idx1 → present
    state = submitGuess(withGuess(state, 'beach'));
    expect(state.keyboardState[latin.keyId('e')]).toBe('present');
    expect(state.keyboardState[latin.keyId('b')]).toBe('absent');
    // e: idx4 → correct로 승급
    state = submitGuess(withGuess(state, 'slate'));
    expect(state.keyboardState[latin.keyId('e')]).toBe('correct');
    // 이후 present 판정이 나와도 correct 유지
    state = submitGuess(withGuess(state, 'beach'));
    expect(state.keyboardState[latin.keyId('e')]).toBe('correct');
  });
});

describe('selectRandomWord', () => {
  it('빈 목록이면 throw 한다', () => {
    expect(() => selectRandomWord([])).toThrow();
  });

  it('목록에 있는 단어를 반환한다', () => {
    const words = ['crane', 'slate'];
    expect(words).toContain(selectRandomWord(words));
  });
});

describe('isGameComplete', () => {
  it('won/lost에서 true, playing에서 false', () => {
    const base = createGame('crane');
    expect(isGameComplete(base)).toBe(false);
    expect(isGameComplete({ ...base, gameStatus: 'won' })).toBe(true);
    expect(isGameComplete({ ...base, gameStatus: 'lost' })).toBe(true);
  });
});
