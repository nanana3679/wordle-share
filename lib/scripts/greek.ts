import type { ScriptAdapter } from './types';

const KEYBOARD_ROWS: string[][] = [
  ['Ε', 'Ρ', 'Τ', 'Υ', 'Θ', 'Ι', 'Ο', 'Π'],
  ['Α', 'Σ', 'Δ', 'Φ', 'Γ', 'Η', 'Ξ', 'Κ', 'Λ'],
  ['ENTER', 'Ζ', 'Χ', 'Ψ', 'Ω', 'Β', 'Ν', 'Μ', 'BACKSPACE'],
];

const TONE_MARKS = /[̀-ͯ]/g;

const stripTones = (s: string) => s.normalize('NFD').replace(TONE_MARKS, '').normalize('NFC');

const normalizeWord = (word: string) =>
  stripTones(word.trim().toLowerCase()).replace(/ς/g, 'σ');

const normalizeSingleChar = (ch: string) =>
  stripTones(ch.toLowerCase()).replace(/ς/g, 'σ');

export const greek: ScriptAdapter = {
  id: 'greek',
  rtl: false,
  splitUnits: (word) => Array.from(stripTones(word)),
  normalize: normalizeWord,
  normalizeChar: normalizeSingleChar,
  isAllowedChar: (ch) => /^[α-ω]$/.test(normalizeSingleChar(ch)),
  isAllowedWord: (word) => /^[α-ω]+$/.test(normalizeWord(word)),
  keyboard: {
    rows: KEYBOARD_ROWS,
    enterLabel: 'ENTER',
    backspaceLabel: 'BACKSPACE',
  },
  keyId: (ch) => ch.toUpperCase(),
  charDescription: '그리스 문자(α-ω)',
};
