import { describe, it, expect } from 'vitest';
import { normalizeWord, validateAllowedChars } from './word-validation';

describe('normalizeWord', () => {
  it('NFC로 정규화한다 (NFD 입력 → 동일 canonical form)', () => {
    const nfd = '가'.normalize('NFD'); // ᄀ + ᅡ (분해형)
    expect(nfd).not.toBe('가');
    expect(normalizeWord(nfd)).toBe('가');

    const eAcuteNfd = 'pokémon'.normalize('NFD');
    expect(normalizeWord(eAcuteNfd)).toBe('pokémon'.normalize('NFC'));
  });

  it('roman은 lowercase로 정규화한다 (LoL → lol)', () => {
    expect(normalizeWord('LoL')).toBe('lol');
    expect(normalizeWord('X-Men')).toBe('x-men');
  });

  it('결정적이다 (idempotent)', () => {
    for (const input of ['가'.normalize('NFD'), 'LoL', 'ぽけもん', "L'Arc"]) {
      const once = normalizeWord(input);
      expect(normalizeWord(once)).toBe(once);
    }
  });
});

describe('validateAllowedChars — latin', () => {
  it('a-z + 공통 추가 문자(0-9, -, \', .)를 허용한다', () => {
    expect(validateAllowedChars('x-men', 'latin')).toBe(true);
    expect(validateAllowedChars("l'arc", 'latin')).toBe(true);
    expect(validateAllowedChars('mr.', 'latin')).toBe(true);
    expect(validateAllowedChars('ff14', 'latin')).toBe(true);
  });

  it('공백·기호·다른 script를 거부한다', () => {
    expect(validateAllowedChars('at&t', 'latin')).toBe(false);
    expect(validateAllowedChars('star wars', 'latin')).toBe(false);
    expect(validateAllowedChars('피카츄', 'latin')).toBe(false);
  });

  it('canonical form이 아닌 대문자를 거부한다 (normalizeWord 선행 전제)', () => {
    expect(validateAllowedChars('LoL', 'latin')).toBe(false);
    expect(validateAllowedChars(normalizeWord('LoL'), 'latin')).toBe(true);
  });

  it('빈 문자열을 거부한다', () => {
    expect(validateAllowedChars('', 'latin')).toBe(false);
  });
});

describe('validateAllowedChars — hangul', () => {
  it('완성형 한글 + 공통 추가 문자를 허용한다', () => {
    expect(validateAllowedChars('피카츄', 'hangul')).toBe(true);
    expect(validateAllowedChars('1세대', 'hangul')).toBe(true);
  });

  it('자모 단독·공백·latin을 거부한다', () => {
    expect(validateAllowedChars('ㅍㅋㅊ', 'hangul')).toBe(false); // 완성형만 허용
    expect(validateAllowedChars('고무고무 열매', 'hangul')).toBe(false);
    expect(validateAllowedChars('lol', 'hangul')).toBe(false);
  });
});

describe('validateAllowedChars — kana', () => {
  it('히라가나 + 공통 추가 문자를 허용한다', () => {
    expect(validateAllowedChars('ぽけもん', 'kana')).toBe(true);
    expect(validateAllowedChars('ff14'.replace(/[a-z]/g, ''), 'kana')).toBe(true); // '14'
  });

  it('가타카나를 거부한다 (canonical은 히라가나)', () => {
    expect(validateAllowedChars('ポケモン', 'kana')).toBe(false);
  });

  it('장음 기호(ー)는 ADR 0014 allowlist에 없어 거부한다', () => {
    // らーめん 같은 단어는 현재 불가 — 필요해지면 allowlist 한 줄 확장으로 해결
    expect(validateAllowedChars('らーめん', 'kana')).toBe(false);
  });
});

describe('validateAllowedChars — 미지원 script', () => {
  it('adapter가 없는 script는 항상 거부한다', () => {
    expect(validateAllowedChars('абв', 'cyrillic')).toBe(false);
  });
});
