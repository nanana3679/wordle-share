import { describe, it, expect } from 'vitest';
import { kana } from '../kana';
import { getScriptAdapter, scriptUsesIme } from '../index';

// 정책: "한 타일 = 한 정규화 문자". 가타카나 → 히라가나 정규화. 모라 결합 없음. (issue #38)
describe('kana.splitUnits', () => {
  it('히라가나 한 글자 = 한 단위', () => {
    expect(kana.splitUnits('あいうえお')).toEqual(['あ', 'い', 'う', 'え', 'お']);
    expect(kana.splitUnits('かきくけこ')).toEqual(['か', 'き', 'く', 'け', 'こ']);
  });

  it('요음(ゃゅょ)도 독립 칸 — 모라 결합 없음', () => {
    expect(kana.splitUnits('きゃ')).toEqual(['き', 'ゃ']);
    expect(kana.splitUnits('ちょこ')).toEqual(['ち', 'ょ', 'こ']);
    expect(kana.splitUnits('きょうりゅう')).toEqual(['き', 'ょ', 'う', 'り', 'ゅ', 'う']);
  });

  it('작은 가나(ぁぃぅぇぉ)도 독립 칸', () => {
    expect(kana.splitUnits('ふぉーく')).toEqual(['ふ', 'ぉ', 'ー', 'く']);
    expect(kana.splitUnits('でぃなー')).toEqual(['で', 'ぃ', 'な', 'ー']);
    expect(kana.splitUnits('うぃ')).toEqual(['う', 'ぃ']);
  });

  it('가타카나는 히라가나로 정규화되어 분해', () => {
    expect(kana.splitUnits('カード')).toEqual(['か', 'ー', 'ど']);
    expect(kana.splitUnits('フォーク')).toEqual(['ふ', 'ぉ', 'ー', 'く']);
    expect(kana.splitUnits('ディナー')).toEqual(['で', 'ぃ', 'な', 'ー']);
    expect(kana.splitUnits('キャ')).toEqual(['き', 'ゃ']);
  });

  it('카타카나/히라가나 동등성: 같은 단위 배열', () => {
    expect(kana.splitUnits('カード')).toEqual(kana.splitUnits('かーど'));
    expect(kana.splitUnits('フォーク')).toEqual(kana.splitUnits('ふぉーく'));
  });

  it('탁점 결합 형태는 1 문자', () => {
    expect(kana.splitUnits('がぎ')).toEqual(['が', 'ぎ']);
    expect(kana.splitUnits('ばびぶべぼ')).toEqual(['ば', 'び', 'ぶ', 'べ', 'ぼ']);
  });

  it('반탁점 결합 형태도 1 문자', () => {
    expect(kana.splitUnits('ぱぴぷぺぽ')).toEqual(['ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ']);
  });

  it('탁점 분리 형태(NFD)도 NFC로 결합 후 처리', () => {
    // 'か' (U+304B) + '゛' (U+3099) → NFC: 'が'
    const nfd = 'が';
    expect(kana.splitUnits(nfd)).toEqual(['が']);
  });

  it('촉음(っ)은 독립 칸', () => {
    expect(kana.splitUnits('がっこう')).toEqual(['が', 'っ', 'こ', 'う']);
    expect(kana.splitUnits('ガッコウ')).toEqual(['が', 'っ', 'こ', 'う']);
  });

  it('장음 부호(ー)도 독립 칸', () => {
    expect(kana.splitUnits('カード')).toEqual(['か', 'ー', 'ど']);
  });

  it('비가나 문자는 무시', () => {
    expect(kana.splitUnits('あa')).toEqual(['あ']);
    expect(kana.splitUnits('あ い')).toEqual(['あ', 'い']);
    expect(kana.splitUnits('あ가')).toEqual(['あ']);
  });
});

describe('kana.isAllowedChar', () => {
  it('히라가나 허용', () => {
    expect(kana.isAllowedChar('あ')).toBe(true);
    expect(kana.isAllowedChar('が')).toBe(true);
    expect(kana.isAllowedChar('ぱ')).toBe(true);
    expect(kana.isAllowedChar('ゃ')).toBe(true);
    expect(kana.isAllowedChar('ぉ')).toBe(true);
    expect(kana.isAllowedChar('っ')).toBe(true);
  });

  it('가타카나 허용 (덱 작성 시점)', () => {
    expect(kana.isAllowedChar('ア')).toBe(true);
    expect(kana.isAllowedChar('ガ')).toBe(true);
    expect(kana.isAllowedChar('ャ')).toBe(true);
    expect(kana.isAllowedChar('ォ')).toBe(true);
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
  it('가나로만 구성된 단어 허용 (히라가나/가타카나 혼용 가능)', () => {
    expect(kana.isAllowedWord('ことのは')).toBe(true);
    expect(kana.isAllowedWord('カード')).toBe(true);
    expect(kana.isAllowedWord('がっこう')).toBe(true);
    expect(kana.isAllowedWord('フォーク')).toBe(true);
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
  it('normalize: trim + NFC + 가타카나 → 히라가나', () => {
    expect(kana.normalize('  ことのは  ')).toBe('ことのは');
    expect(kana.normalize('カード')).toBe('かーど');
    expect(kana.normalize('フォーク')).toBe('ふぉーく');
    // NFD 'か'+'゛' → NFC 'が'
    expect(kana.normalize('が')).toBe('が');
  });

  it('normalizeChar: 가타카나 → 히라가나, 그 외 그대로', () => {
    expect(kana.normalizeChar('カ')).toBe('か');
    expect(kana.normalizeChar('ガ')).toBe('が');
    expect(kana.normalizeChar('ャ')).toBe('ゃ');
    expect(kana.normalizeChar('あ')).toBe('あ');
    expect(kana.normalizeChar('ー')).toBe('ー');
  });

  it('히라가나/가타카나 매칭 동등성: 같은 normalize 결과', () => {
    expect(kana.normalize('カード')).toBe(kana.normalize('かーど'));
  });
});

describe('kana.keyId', () => {
  it('키 식별자도 히라가나로 정규화 (키보드 상태 통일)', () => {
    expect(kana.keyId('あ')).toBe('あ');
    expect(kana.keyId('が')).toBe('が');
    expect(kana.keyId('カ')).toBe('か');
    expect(kana.keyId('ガ')).toBe('が');
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
    expect(kana.keyboard.rows[0]).toContain('あ');
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
