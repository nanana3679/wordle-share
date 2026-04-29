import type { ScriptAdapter } from './types';

const SOFIT_MAP: Record<string, string> = {
  'ך': 'כ',
  'ם': 'מ',
  'ן': 'נ',
  'ף': 'פ',
  'ץ': 'צ',
};

function foldSofit(word: string): string {
  let out = '';
  for (const ch of word) {
    out += SOFIT_MAP[ch] ?? ch;
  }
  return out;
}

const HEBREW_RE = /^[א-ת]$/;
const HEBREW_WORD_RE = /^[א-ת]+$/;

const KEYBOARD_ROWS: string[][] = [
  ['ק', 'ר', 'א', 'ט', 'ו', 'ן', 'ם', 'פ'],
  ['ש', 'ד', 'ג', 'כ', 'ע', 'י', 'ח', 'ל', 'ך', 'ף'],
  ['ENTER', 'ז', 'ס', 'ב', 'ה', 'נ', 'מ', 'צ', 'ת', 'ץ', 'BACKSPACE'],
];

export const hebrew: ScriptAdapter = {
  id: 'hebrew',
  rtl: true,
  splitUnits: (word) => Array.from(word.normalize('NFC')),
  normalize: (word) => foldSofit(word.trim().normalize('NFC')),
  normalizeChar: (ch) => foldSofit(ch.normalize('NFC')),
  isAllowedChar: (ch) => HEBREW_RE.test(foldSofit(ch.normalize('NFC'))),
  isAllowedWord: (word) => HEBREW_WORD_RE.test(foldSofit(word.normalize('NFC'))),
  keyboard: {
    rows: KEYBOARD_ROWS,
    enterLabel: 'ENTER',
    backspaceLabel: 'BACKSPACE',
  },
  keyId: (ch) => foldSofit(ch.normalize('NFC')),
  charDescription: '히브리 문자(א-ת)',
};
