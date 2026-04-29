import type { ScriptAdapter } from './types';

// 한글 어댑터 (꼬들 레퍼런스)
//
// Contract:
// - 입력/키보드 레이어에서는 자모(호환 자모 영역 ㄱ-ㅎ, ㅏ-ㅣ) 직접 입력을 허용 → isAllowedChar
//   ※ U+1100 Hangul Jamo / Extended-A/B 영역은 지원하지 않음 (현대 한글 게임 정책)
// - 덱 단어 저장 시에는 음절(가-힣)로만 구성된 단어만 허용 → isAllowedWord
//   (자모 시퀀스는 IME 조합 결과가 아니므로 단어 후보로 받지 않는다)
// - normalize는 trim + NFC 정규화 (조합형 입력이 들어와도 음절 동치 보장)
// - splitUnits는 음절을 자모로 분해, 자모 직접 입력은 통과, 그 외 문자는 무시
//   (입력은 isAllowedWord/isAllowedChar로 사전 검증되어야 함)
// - 종성 겹받침은 단자모 2개로 추가 분해 (ㄳ→ㄱㅅ 등 11종)
// - 중성의 이중모음(ㅘ, ㅝ, ㅢ 등)은 분해하지 않고 단일 자모로 보존 — 꼬들 표준
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
    for (const ch of word.normalize('NFC')) {
      if (SYLLABLE_RE.test(ch)) {
        result.push(...decomposeSyllable(ch));
      } else if (JAMO_RE.test(ch)) {
        result.push(ch);
      }
      // 그 외 문자(ASCII, emoji, 옛한글 자모 등)는 무시
    }
    return result;
  },
  normalize: (word) => word.trim().normalize('NFC'),
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
