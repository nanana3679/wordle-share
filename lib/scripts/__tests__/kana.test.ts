import { describe, it, expect } from 'vitest';
import { kana } from '../kana';
import { getScriptAdapter, scriptUsesIme } from '../index';

describe('kana.splitUnits', () => {
  it('단순 모라', () => {
    expect(kana.splitUnits('あいうえお')).toEqual(['あ', 'い', 'う', 'え', 'お']);
    expect(kana.splitUnits('かきくけこ')).toEqual(['か', 'き', 'く', 'け', 'こ']);
  });

  it('요음 묶기 — ゃゅょ', () => {
    expect(kana.splitUnits('きゃ')).toEqual(['きゃ']);
    expect(kana.splitUnits('しゅ')).toEqual(['しゅ']);
    expect(kana.splitUnits('ちょこ')).toEqual(['ちょ', 'こ']);
    expect(kana.splitUnits('きょうりゅう')).toEqual(['きょ', 'う', 'りゅ', 'う']);
  });

  it('요음 묶기 — 가타카나 ャュョ', () => {
    expect(kana.splitUnits('キャ')).toEqual(['キャ']);
    expect(kana.splitUnits('チョコ')).toEqual(['チョ', 'コ']);
  });

  it('탁점 결합 형태는 1 모라', () => {
    expect(kana.splitUnits('がぎ')).toEqual(['が', 'ぎ']);
    expect(kana.splitUnits('ばびぶべぼ')).toEqual(['ば', 'び', 'ぶ', 'べ', 'ぼ']);
  });

  it('반탁점 결합 형태도 1 모라', () => {
    expect(kana.splitUnits('ぱぴぷぺぽ')).toEqual(['ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ']);
  });

  it('탁점 분리 형태(NFD)도 NFC로 결합 후 처리', () => {
    // 'か' (U+304B) + '゛' (U+3099) → NFC: 'が'
    const nfd = 'が';
    expect(kana.splitUnits(nfd)).toEqual(['が']);
  });

  it('촉음(っ)은 단독 1 모라', () => {
    expect(kana.splitUnits('がっこう')).toEqual(['が', 'っ', 'こ', 'う']);
  });

  it('장음 부호(ー)도 1 모라', () => {
    expect(kana.splitUnits('カード')).toEqual(['カ', 'ー', 'ド']);
  });

  it('비가나 문자(ASCII/한글 등)는 무시', () => {
    expect(kana.splitUnits('あa')).toEqual(['あ']);
    expect(kana.splitUnits('あ い')).toEqual(['あ', 'い']);
    expect(kana.splitUnits('あ가')).toEqual(['あ']);
  });

  it('맨 앞에 작은 가나가 와도 안전 (직전 모라 없음)', () => {
    expect(kana.splitUnits('ゃ')).toEqual(['ゃ']);
  });
});

describe('kana.isAllowedChar', () => {
  it('히라가나 허용', () => {
    expect(kana.isAllowedChar('あ')).toBe(true);
    expect(kana.isAllowedChar('が')).toBe(true);
    expect(kana.isAllowedChar('ぱ')).toBe(true);
    expect(kana.isAllowedChar('ゃ')).toBe(true);
    expect(kana.isAllowedChar('っ')).toBe(true);
  });

  it('가타카나 허용', () => {
    expect(kana.isAllowedChar('ア')).toBe(true);
    expect(kana.isAllowedChar('ガ')).toBe(true);
    expect(kana.isAllowedChar('ャ')).toBe(true);
  });

  it('장음 부호 허용', () => {
    expect(kana.isAllowedChar('ー')).toBe(true);
  });

  it('가나 외 거부', () => {
    expect(kana.isAllowedChar('a')).toBe(false);
    expect(kana.isAllowedChar('한')).toBe(false);
    expect(kana.isAllowedChar('漢')).toBe(false);
    expect(kana.isAllowedChar('1')).toBe(false);
    expect(kana.isAllowedChar(' ')).toBe(false);
  });
});

describe('kana.isAllowedWord', () => {
  it('가나로만 구성된 단어 허용', () => {
    expect(kana.isAllowedWord('ことのは')).toBe(true);
    expect(kana.isAllowedWord('きょうりゅう')).toBe(true);
    expect(kana.isAllowedWord('カード')).toBe(true);
    expect(kana.isAllowedWord('がっこう')).toBe(true);
  });

  it('비가나 포함 거부', () => {
    expect(kana.isAllowedWord('hello')).toBe(false);
    expect(kana.isAllowedWord('あa')).toBe(false);
    expect(kana.isAllowedWord('한글')).toBe(false);
    expect(kana.isAllowedWord('漢字')).toBe(false);
  });

  it('빈 문자열 거부', () => {
    expect(kana.isAllowedWord('')).toBe(false);
  });
});

describe('kana.normalize / normalizeChar', () => {
  it('normalize는 trim + NFC', () => {
    expect(kana.normalize('  ことのは  ')).toBe('ことのは');
    // NFD 'か'+'゛' → NFC 'が'
    expect(kana.normalize('が')).toBe('が');
  });

  it('normalizeChar는 NFC 적용', () => {
    expect(kana.normalizeChar('あ')).toBe('あ');
    expect(kana.normalizeChar('が')).toBe('が');
  });
});

describe('kana.keyId', () => {
  it('가나를 그대로 키 식별자로 사용', () => {
    expect(kana.keyId('あ')).toBe('あ');
    expect(kana.keyId('が')).toBe('が');
    expect(kana.keyId('ャ')).toBe('ャ');
  });
});

describe('kana adapter 기본 속성', () => {
  it('id, rtl, charDescription', () => {
    expect(kana.id).toBe('kana');
    expect(kana.rtl).toBe(false);
    expect(kana.charDescription).toBe('가나(히라가나/가타카나)');
  });

  it('50음 가나표 자판', () => {
    expect(kana.keyboard.rows.length).toBeGreaterThanOrEqual(5);
    // 첫 행에 あ-단 가나 포함
    expect(kana.keyboard.rows[0]).toContain('あ');
    // 마지막 행에 ENTER/BACKSPACE 포함
    const lastRow = kana.keyboard.rows[kana.keyboard.rows.length - 1];
    expect(lastRow).toContain('ENTER');
    expect(lastRow).toContain('BACKSPACE');
  });
});

describe('registry 등록', () => {
  it('getScriptAdapter("kana")가 kana 어댑터를 반환', () => {
    expect(getScriptAdapter('kana')).toBe(kana);
  });

  it('scriptUsesIme(kana) === true', () => {
    expect(scriptUsesIme('kana')).toBe(true);
  });

  it('latin/hangul 회귀 없음', () => {
    expect(getScriptAdapter('latin').id).toBe('latin');
    expect(getScriptAdapter('hangul').id).toBe('hangul');
  });
});
