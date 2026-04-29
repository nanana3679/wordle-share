import type { ScriptAdapter } from './types';

const KEYBOARD_ROWS: string[][] = [
  ['Й', 'Ц', 'У', 'К', 'Е', 'Н', 'Г', 'Ш', 'Щ', 'З', 'Х', 'Ъ'],
  ['Ф', 'Ы', 'В', 'А', 'П', 'Р', 'О', 'Л', 'Д', 'Ж', 'Э'],
  ['ENTER', 'Я', 'Ч', 'С', 'М', 'И', 'Т', 'Ь', 'Б', 'Ю', 'BACKSPACE'],
];

const normalizeWord = (word: string) =>
  word.trim().toLowerCase().replace(/ё/g, 'е');

const normalizeSingleChar = (ch: string) =>
  ch.toLowerCase().replace(/ё/g, 'е');

export const cyrillic: ScriptAdapter = {
  id: 'cyrillic',
  rtl: false,
  splitUnits: (word) => Array.from(word.normalize('NFC')),
  normalize: normalizeWord,
  normalizeChar: normalizeSingleChar,
  isAllowedChar: (ch) => /^[а-я]$/.test(normalizeSingleChar(ch)),
  isAllowedWord: (word) => /^[а-я]+$/.test(normalizeWord(word)),
  keyboard: {
    rows: KEYBOARD_ROWS,
    enterLabel: 'ENTER',
    backspaceLabel: 'BACKSPACE',
  },
  keyId: (ch) => ch.toUpperCase(),
  charDescription: '키릴 문자(а-я)',
};
