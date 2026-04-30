import type { ScriptAdapter } from './types';

// 가나(히라가나/가타카나) 어댑터
//
// 정책 (issue #38 확정):
// - "한 타일 = 한 정규화 문자" 규칙. 모라 단위가 아니라 가나 문자 단위로 분해한다.
// - 가타카나는 게임 내에서 히라가나로 정규화 (`カ` === `か`).
//   덱 작성 시점에는 둘 다 입력 허용 (작성자 의도 보존은 표시 단계가 아니라 저장 형태로만).
// - 요음(`ゃゅょ`), 작은 가나(`ぁぃぅぇぉゎ`), 촉음(`っ`), 장음(`ー`), 발음(`ん`) 모두 독립 칸.
// - NFC 정규화로 분리된 탁점/반탁점(`か` + `゛`)은 결합 형태(`が`)로 합쳐서 1 문자로 본다.
const HIRAGANA_BASE = 0x3041; // ぁ
const HIRAGANA_END = 0x3096; // ゖ
const KATAKANA_BASE = 0x30a1; // ァ
const KATAKANA_HIRAGANA_END = 0x30f6; // ヶ — 이 범위까지 히라가나에 1:1 대응 (-0x60)
const KATAKANA_END = 0x30fa; // ヺ — 입력 허용 범위. ヷヸヹヺ는 히라가나 대응 없음
const PROLONGED_SOUND_MARK = 0x30fc; // ー

const KATAKANA_TO_HIRAGANA_OFFSET = 0x60;

function toHiragana(s: string): string {
  let result = '';
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    if (code >= KATAKANA_BASE && code <= KATAKANA_HIRAGANA_END) {
      result += String.fromCodePoint(code - KATAKANA_TO_HIRAGANA_OFFSET);
    } else {
      result += ch;
    }
  }
  return result;
}

function isKanaCodePoint(code: number): boolean {
  return (
    (code >= HIRAGANA_BASE && code <= HIRAGANA_END) ||
    (code >= KATAKANA_BASE && code <= KATAKANA_END) ||
    code === PROLONGED_SOUND_MARK
  );
}

function isKanaChar(ch: string): boolean {
  const code = ch.codePointAt(0);
  return code !== undefined && isKanaCodePoint(code);
}

function normalize(word: string): string {
  return toHiragana(word.trim().normalize('NFC'));
}

// ことのはたんご 자판: 50음 가나표 (gojuon 행 기준 가로 배치) + 탁/반탁 + 작은 가나/장음
const KEYBOARD_ROWS: string[][] = [
  ['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ'],
  ['い', 'き', 'し', 'ち', 'に', 'ひ', 'み', 'り', 'を'],
  ['う', 'く', 'す', 'つ', 'ぬ', 'ふ', 'む', 'ゆ', 'る', 'ん'],
  ['え', 'け', 'せ', 'て', 'ね', 'へ', 'め', 'れ'],
  ['お', 'こ', 'そ', 'と', 'の', 'ほ', 'も', 'よ', 'ろ'],
  ['が', 'ぎ', 'ぐ', 'げ', 'ご', 'ざ', 'じ', 'ず', 'ぜ', 'ぞ'],
  ['だ', 'ぢ', 'づ', 'で', 'ど', 'ば', 'び', 'ぶ', 'べ', 'ぼ'],
  ['ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ', 'ゃ', 'ゅ', 'ょ', 'っ', 'ー'],
  ['ENTER', 'BACKSPACE'],
];

export const kana: ScriptAdapter = {
  id: 'kana',
  rtl: false,
  splitUnits: (word) => Array.from(normalize(word)).filter(isKanaChar),
  normalize,
  normalizeChar: (ch) => toHiragana(ch.normalize('NFC')),
  // 입력 단계에서는 가타카나/히라가나 모두 허용 (덱 작성 자유도 유지)
  isAllowedChar: (ch) => {
    const c = ch.normalize('NFC');
    return Array.from(c).every(isKanaChar) && c.length > 0;
  },
  isAllowedWord: (word) => {
    const w = word.normalize('NFC');
    if (w.length === 0) return false;
    return Array.from(w).every(isKanaChar);
  },
  keyboard: {
    rows: KEYBOARD_ROWS,
    enterLabel: 'ENTER',
    backspaceLabel: 'BACKSPACE',
  },
  keyId: (ch) => toHiragana(ch),
  charDescription: '가나(히라가나/가타카나)',
};
