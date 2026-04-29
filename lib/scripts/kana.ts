import type { ScriptAdapter } from './types';

// 가나(히라가나/가타카나) 어댑터 — ことのはたんご 레퍼런스
//
// Contract:
// - 모라 단위 분해. 기본은 가나 1자 = 1 모라
// - 요음(ゃゅょ/ャュョ)은 직전 모라에 합쳐 1 단위로 묶는다 (예: 'きゃ' → ['きゃ'])
// - 탁점·반탁점은 결합 형태(が, ぱ 등)를 1 모라로 본다 (NFC 가정)
//   분리 형태(か + ゛)로 들어와도 normalize/splitUnits가 NFC로 합성 후 처리
// - 가타카나 ↔ 히라가나 자동 변환은 하지 않는다 (덱 작성자 의도 보존)
// - 장음 부호(ー)도 1 모라로 허용
const SMALL_YA_RE = /[ゃゅょャュョ]/;

const KANA_CHAR_RE = /^[ぁ-ゖァ-ヺー]$/;
const KANA_WORD_RE = /^[ぁ-ゖァ-ヺー]+$/;

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
  splitUnits: (word) => {
    const result: string[] = [];
    for (const ch of word.normalize('NFC')) {
      if (!KANA_CHAR_RE.test(ch)) continue;
      if (SMALL_YA_RE.test(ch) && result.length > 0) {
        result[result.length - 1] += ch;
      } else {
        result.push(ch);
      }
    }
    return result;
  },
  normalize: (word) => word.trim().normalize('NFC'),
  normalizeChar: (ch) => ch.normalize('NFC'),
  isAllowedChar: (ch) => KANA_CHAR_RE.test(ch.normalize('NFC')),
  isAllowedWord: (word) => KANA_WORD_RE.test(word.normalize('NFC')),
  keyboard: {
    rows: KEYBOARD_ROWS,
    enterLabel: 'ENTER',
    backspaceLabel: 'BACKSPACE',
  },
  keyId: (ch) => ch,
  charDescription: '가나(히라가나/가타카나)',
};
