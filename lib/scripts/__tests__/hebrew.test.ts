import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hebrew } from '../hebrew';

describe('hebrew.normalize', () => {
  it('sofit → 일반형 (kaf/mem/nun/pe/tsadi)', () => {
    assert.equal(hebrew.normalize('שלום'), 'שלומ'); // ם → מ
    assert.equal(hebrew.normalize('מלך'), 'מלכ'); // ך → כ
    assert.equal(hebrew.normalize('דין'), 'דינ'); // ן → נ
    assert.equal(hebrew.normalize('כסף'), 'כספ'); // ף → פ
    assert.equal(hebrew.normalize('עץ'), 'עצ'); // ץ → צ
  });

  it('이미 일반형인 문자는 그대로', () => {
    assert.equal(hebrew.normalize('כמנפצ'), 'כמנפצ');
  });

  it('trim 적용', () => {
    assert.equal(hebrew.normalize('  שלום  '), 'שלומ');
  });
});

describe('hebrew.normalizeChar', () => {
  it('sofit 단일 문자 매핑', () => {
    assert.equal(hebrew.normalizeChar('ך'), 'כ');
    assert.equal(hebrew.normalizeChar('ם'), 'מ');
    assert.equal(hebrew.normalizeChar('ן'), 'נ');
    assert.equal(hebrew.normalizeChar('ף'), 'פ');
    assert.equal(hebrew.normalizeChar('ץ'), 'צ');
  });
});

describe('hebrew.splitUnits', () => {
  it('codepoint 단위 분리', () => {
    assert.deepEqual(hebrew.splitUnits('שלום'), ['ש', 'ל', 'ו', 'ם']);
  });
});

describe('hebrew.isAllowedChar / isAllowedWord', () => {
  it('히브리 자모 허용 (sofit 포함)', () => {
    assert.equal(hebrew.isAllowedChar('א'), true);
    assert.equal(hebrew.isAllowedChar('ת'), true);
    assert.equal(hebrew.isAllowedChar('ך'), true);
    assert.equal(hebrew.isAllowedChar('ם'), true);
  });

  it('비히브리 거부', () => {
    assert.equal(hebrew.isAllowedChar('a'), false);
    assert.equal(hebrew.isAllowedChar('1'), false);
    assert.equal(hebrew.isAllowedChar(' '), false);
    assert.equal(hebrew.isAllowedWord('shalom'), false);
    assert.equal(hebrew.isAllowedWord('שלום!'), false);
  });

  it('히브리 단어 허용 (sofit 포함)', () => {
    assert.equal(hebrew.isAllowedWord('שלום'), true);
    assert.equal(hebrew.isAllowedWord('מלך'), true);
  });
});

describe('hebrew.keyId', () => {
  it('sofit 입력도 일반형 키로 매핑', () => {
    assert.equal(hebrew.keyId('ך'), 'כ');
    assert.equal(hebrew.keyId('כ'), 'כ');
  });
});

describe('hebrew adapter shape', () => {
  it('rtl=true, id=hebrew', () => {
    assert.equal(hebrew.id, 'hebrew');
    assert.equal(hebrew.rtl, true);
  });
});
