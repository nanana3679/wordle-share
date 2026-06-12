import { describe, it, expect } from 'vitest';
import { deriveSpecialChars, deriveKeyStates } from './game-keyboard';
import { getScriptAdapter } from './scripts';

describe('deriveSpecialChars — snapshot 단어에서 특수키 derive (ADR 0014, AC)', () => {
  it('사용된 특수문자만, 정의된 순서로 반환한다', () => {
    expect(deriveSpecialChars(['x-men', 'mr.', 'ff14'])).toEqual(['1', '4', '-', '.']);
  });

  it('특수문자가 없으면 빈 배열 (UI 노이즈 0)', () => {
    expect(deriveSpecialChars(['pikachu', '피카츄'])).toEqual([]);
  });

  it('알파벳/한글은 특수키로 derive되지 않는다', () => {
    expect(deriveSpecialChars(["l'arc"])).toEqual(["'"]);
  });

  it('입력이 같으면 결과도 같다 (결정성)', () => {
    const words = ['x-men', "l'arc", '1세대'];
    expect(deriveSpecialChars(words)).toEqual(deriveSpecialChars(words));
  });
});

describe('deriveKeyStates — 시도 기록 → 키 상태', () => {
  const latin = getScriptAdapter('latin');

  it('correct > present > absent 우선순위로 승급하고 강등하지 않는다', () => {
    const states = deriveKeyStates(
      [
        { units: ['a', 'b'], states: ['present', 'absent'] },
        { units: ['a', 'c'], states: ['correct', 'present'] },
        { units: ['a', 'c'], states: ['absent', 'absent'] }, // 강등 시도
      ],
      latin,
    );
    expect(states[latin.keyId('a')]).toBe('correct');
    expect(states[latin.keyId('b')]).toBe('absent');
    expect(states[latin.keyId('c')]).toBe('present');
  });

  it('한글은 자모 keyId 단위로 상태를 합친다', () => {
    const hangul = getScriptAdapter('hangul');
    const states = deriveKeyStates(
      [{ units: ['ㅍ', 'ㅣ'], states: ['correct', 'absent'] }],
      hangul,
    );
    expect(states[hangul.keyId('ㅍ')]).toBe('correct');
    expect(states[hangul.keyId('ㅣ')]).toBe('absent');
  });

  it('시도가 없으면 빈 객체', () => {
    expect(deriveKeyStates([], latin)).toEqual({});
  });
});
