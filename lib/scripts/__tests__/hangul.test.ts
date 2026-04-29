import { describe, it, expect } from 'vitest';
import { hangul } from '../hangul';
import { getScriptAdapter } from '../index';

describe('hangul.splitUnits', () => {
  it('단순 음절 분해 — 받침 없음', () => {
    expect(hangul.splitUnits('가')).toEqual(['ㄱ', 'ㅏ']);
    expect(hangul.splitUnits('나')).toEqual(['ㄴ', 'ㅏ']);
    expect(hangul.splitUnits('마')).toEqual(['ㅁ', 'ㅏ']);
  });

  it('단순 음절 분해 — 단일 받침', () => {
    expect(hangul.splitUnits('각')).toEqual(['ㄱ', 'ㅏ', 'ㄱ']);
    expect(hangul.splitUnits('밤')).toEqual(['ㅂ', 'ㅏ', 'ㅁ']);
    expect(hangul.splitUnits('힣')).toEqual(['ㅎ', 'ㅣ', 'ㅎ']);
  });

  it('겹받침 분해', () => {
    expect(hangul.splitUnits('값')).toEqual(['ㄱ', 'ㅏ', 'ㅂ', 'ㅅ']);
    expect(hangul.splitUnits('닭')).toEqual(['ㄷ', 'ㅏ', 'ㄹ', 'ㄱ']);
    expect(hangul.splitUnits('앉')).toEqual(['ㅇ', 'ㅏ', 'ㄴ', 'ㅈ']);
    expect(hangul.splitUnits('많')).toEqual(['ㅁ', 'ㅏ', 'ㄴ', 'ㅎ']);
    expect(hangul.splitUnits('삶')).toEqual(['ㅅ', 'ㅏ', 'ㄹ', 'ㅁ']);
    expect(hangul.splitUnits('밟')).toEqual(['ㅂ', 'ㅏ', 'ㄹ', 'ㅂ']);
    expect(hangul.splitUnits('곬')).toEqual(['ㄱ', 'ㅗ', 'ㄹ', 'ㅅ']);
    expect(hangul.splitUnits('핥')).toEqual(['ㅎ', 'ㅏ', 'ㄹ', 'ㅌ']);
    expect(hangul.splitUnits('읊')).toEqual(['ㅇ', 'ㅡ', 'ㄹ', 'ㅍ']);
    expect(hangul.splitUnits('잃')).toEqual(['ㅇ', 'ㅣ', 'ㄹ', 'ㅎ']);
  });

  it('이중모음은 분해하지 않음', () => {
    expect(hangul.splitUnits('과')).toEqual(['ㄱ', 'ㅘ']);
    expect(hangul.splitUnits('워')).toEqual(['ㅇ', 'ㅝ']);
    expect(hangul.splitUnits('의')).toEqual(['ㅇ', 'ㅢ']);
    expect(hangul.splitUnits('왜')).toEqual(['ㅇ', 'ㅙ']);
  });

  it('여러 음절', () => {
    expect(hangul.splitUnits('한글')).toEqual(['ㅎ', 'ㅏ', 'ㄴ', 'ㄱ', 'ㅡ', 'ㄹ']);
    expect(hangul.splitUnits('꼬들')).toEqual(['ㄲ', 'ㅗ', 'ㄷ', 'ㅡ', 'ㄹ']);
  });

  it('자모 직접 입력은 그대로 통과', () => {
    expect(hangul.splitUnits('ㄱㄴㄷ')).toEqual(['ㄱ', 'ㄴ', 'ㄷ']);
    expect(hangul.splitUnits('ㅏㅑ')).toEqual(['ㅏ', 'ㅑ']);
  });

  it('NFD 조합형 입력도 NFC로 정규화 후 분해', () => {
    // U+1100 ㄱ + U+1161 ㅏ → NFC: '가'
    const nfd = '가';
    expect(hangul.splitUnits(nfd)).toEqual(['ㄱ', 'ㅏ']);
  });

  it('비한글 문자(ASCII/emoji)는 무시', () => {
    expect(hangul.splitUnits('가a')).toEqual(['ㄱ', 'ㅏ']);
    expect(hangul.splitUnits('한 글')).toEqual(['ㅎ', 'ㅏ', 'ㄴ', 'ㄱ', 'ㅡ', 'ㄹ']);
  });
});

describe('hangul.isAllowedChar', () => {
  it('한글 음절 허용', () => {
    expect(hangul.isAllowedChar('가')).toBe(true);
    expect(hangul.isAllowedChar('힣')).toBe(true);
    expect(hangul.isAllowedChar('값')).toBe(true);
  });

  it('자모 허용', () => {
    expect(hangul.isAllowedChar('ㄱ')).toBe(true);
    expect(hangul.isAllowedChar('ㅎ')).toBe(true);
    expect(hangul.isAllowedChar('ㅏ')).toBe(true);
    expect(hangul.isAllowedChar('ㅣ')).toBe(true);
  });

  it('한글 외 거부', () => {
    expect(hangul.isAllowedChar('a')).toBe(false);
    expect(hangul.isAllowedChar('A')).toBe(false);
    expect(hangul.isAllowedChar('1')).toBe(false);
    expect(hangul.isAllowedChar(' ')).toBe(false);
    expect(hangul.isAllowedChar('!')).toBe(false);
  });
});

describe('hangul.isAllowedWord', () => {
  it('한글 음절로만 구성된 단어 허용', () => {
    expect(hangul.isAllowedWord('한글')).toBe(true);
    expect(hangul.isAllowedWord('값')).toBe(true);
    expect(hangul.isAllowedWord('닭갈비')).toBe(true);
  });

  it('자모만으로 구성된 단어는 거부 (덱 단어로는 받지 않음)', () => {
    expect(hangul.isAllowedWord('ㄱㄴ')).toBe(false);
    expect(hangul.isAllowedWord('ㅏ')).toBe(false);
  });

  it('영문/혼합 거부', () => {
    expect(hangul.isAllowedWord('hello')).toBe(false);
    expect(hangul.isAllowedWord('한a')).toBe(false);
    expect(hangul.isAllowedWord('1글')).toBe(false);
  });

  it('빈 문자열 거부', () => {
    expect(hangul.isAllowedWord('')).toBe(false);
  });
});

describe('hangul.normalize / normalizeChar', () => {
  it('normalize는 trim 적용', () => {
    expect(hangul.normalize('  한글  ')).toBe('한글');
    expect(hangul.normalize('한글')).toBe('한글');
  });

  it('normalize는 NFC 정규화로 조합형(NFD) 입력을 합성형으로 통일', () => {
    // U+1100 ㄱ + U+1161 ㅏ → '가' (NFC)
    const nfd = '가';
    expect(hangul.normalize(nfd)).toBe('가');
  });

  it('normalizeChar는 글자 그대로 반환', () => {
    expect(hangul.normalizeChar('ㄱ')).toBe('ㄱ');
    expect(hangul.normalizeChar('가')).toBe('가');
  });
});

describe('hangul.keyId', () => {
  it('자모를 그대로 키 식별자로 사용', () => {
    expect(hangul.keyId('ㄱ')).toBe('ㄱ');
    expect(hangul.keyId('ㅏ')).toBe('ㅏ');
  });
});

describe('hangul adapter 기본 속성', () => {
  it('id, rtl, charDescription', () => {
    expect(hangul.id).toBe('hangul');
    expect(hangul.rtl).toBe(false);
    expect(hangul.charDescription).toBe('한글');
  });

  it('두벌식 자판 레이아웃', () => {
    expect(hangul.keyboard.rows).toHaveLength(3);
    expect(hangul.keyboard.rows[0]).toContain('ㅂ');
    expect(hangul.keyboard.rows[2][0]).toBe('ENTER');
    expect(hangul.keyboard.rows[2][hangul.keyboard.rows[2].length - 1]).toBe('BACKSPACE');
  });
});

describe('registry 등록', () => {
  it('getScriptAdapter("hangul")이 hangul 어댑터를 반환', () => {
    expect(getScriptAdapter('hangul')).toBe(hangul);
  });

  it('latin 어댑터는 회귀 없이 그대로', () => {
    const latin = getScriptAdapter('latin');
    expect(latin.id).toBe('latin');
  });
});
