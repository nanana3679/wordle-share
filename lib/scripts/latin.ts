import type { ScriptAdapter } from './types';

const KEYBOARD_ROWS: string[][] = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
];

export const latin: ScriptAdapter = {
  id: 'latin',
  rtl: false,
  splitUnits: (word) => Array.from(word),
  normalize: (word) => word.trim().toLowerCase(),
  normalizeChar: (ch) => ch.toLowerCase(),
  isAllowedChar: (ch) => /^[a-zA-Z]$/.test(ch),
  isAllowedWord: (word) => /^[a-zA-Z]+$/.test(word),
  keyboard: {
    rows: KEYBOARD_ROWS,
    enterLabel: 'ENTER',
    backspaceLabel: 'BACKSPACE',
  },
  keyId: (ch) => ch.toUpperCase(),
  charDescription: '영문자(a-z, A-Z)',
};
