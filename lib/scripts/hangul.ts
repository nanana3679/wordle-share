import type { ScriptAdapter } from './types';

const SBase = 0xac00;
const LCount = 19;
const VCount = 21;
const TCount = 28;
const NCount = VCount * TCount; // 588
const SCount = LCount * NCount; // 11172
const SEnd = SBase + SCount - 1; // 0xD7A3

const CHOSEONG = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];

const JUNGSEONG = [
  'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ',
  'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ',
];

// index 0 = no jongseong (받침 없음)
const JONGSEONG: (string | null)[] = [
  null, 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ',
  'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];

// 꼬들 기준: 겹받침을 두 단자모로 분해 (이중모음은 분해하지 않음)
const COMPOUND_JONGSEONG: Record<string, [string, string]> = {
  'ㄳ': ['ㄱ', 'ㅅ'],
  'ㄵ': ['ㄴ', 'ㅈ'],
  'ㄶ': ['ㄴ', 'ㅎ'],
  'ㄺ': ['ㄹ', 'ㄱ'],
  'ㄻ': ['ㄹ', 'ㅁ'],
  'ㄼ': ['ㄹ', 'ㅂ'],
  'ㄽ': ['ㄹ', 'ㅅ'],
  'ㄾ': ['ㄹ', 'ㅌ'],
  'ㄿ': ['ㄹ', 'ㅍ'],
  'ㅀ': ['ㄹ', 'ㅎ'],
  'ㅄ': ['ㅂ', 'ㅅ'],
};

function decomposeSyllable(syllable: string): string[] {
  const code = syllable.codePointAt(0);
  if (code === undefined || code < SBase || code > SEnd) {
    return [syllable];
  }
  const sIndex = code - SBase;
  const lIndex = Math.floor(sIndex / NCount);
  const vIndex = Math.floor((sIndex % NCount) / TCount);
  const tIndex = sIndex % TCount;

  const result: string[] = [CHOSEONG[lIndex], JUNGSEONG[vIndex]];
  if (tIndex > 0) {
    const t = JONGSEONG[tIndex]!;
    const compound = COMPOUND_JONGSEONG[t];
    if (compound) {
      result.push(compound[0], compound[1]);
    } else {
      result.push(t);
    }
  }
  return result;
}

const SYLLABLE_RE = /^[가-힣]$/;
const JAMO_RE = /^[ㄱ-ㅎㅏ-ㅣ]$/;
const ALL_SYLLABLE_RE = /^[가-힣]+$/;

// 두벌식 자판 (꼬들 레이아웃)
const KEYBOARD_ROWS: string[][] = [
  ['ㅂ', 'ㅈ', 'ㄷ', 'ㄱ', 'ㅅ', 'ㅛ', 'ㅕ', 'ㅑ', 'ㅐ', 'ㅔ'],
  ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ', 'ㅗ', 'ㅓ', 'ㅏ', 'ㅣ'],
  ['ENTER', 'ㅋ', 'ㅌ', 'ㅊ', 'ㅍ', 'ㅠ', 'ㅜ', 'ㅡ', 'BACKSPACE'],
];

export const hangul: ScriptAdapter = {
  id: 'hangul',
  rtl: false,
  splitUnits: (word) => {
    const result: string[] = [];
    for (const ch of word) {
      if (SYLLABLE_RE.test(ch)) {
        result.push(...decomposeSyllable(ch));
      } else {
        result.push(ch);
      }
    }
    return result;
  },
  normalize: (word) => word.trim(),
  normalizeChar: (ch) => ch,
  isAllowedChar: (ch) => SYLLABLE_RE.test(ch) || JAMO_RE.test(ch),
  isAllowedWord: (word) => ALL_SYLLABLE_RE.test(word),
  keyboard: {
    rows: KEYBOARD_ROWS,
    enterLabel: 'ENTER',
    backspaceLabel: 'BACKSPACE',
  },
  keyId: (ch) => ch,
  charDescription: '한글',
};
