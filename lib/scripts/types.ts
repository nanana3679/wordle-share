export type ScriptId =
  | 'latin'
  | 'cyrillic'
  | 'greek'
  | 'hangul'
  | 'kana'
  | 'hebrew'
  | 'arabic';

export interface KeyboardLayout {
  rows: string[][];
  enterLabel: string;
  backspaceLabel: string;
}

export interface ScriptAdapter {
  id: ScriptId;
  rtl: boolean;
  splitUnits(word: string): string[];
  normalize(word: string): string;
  normalizeChar(ch: string): string;
  isAllowedChar(ch: string): boolean;
  isAllowedWord(word: string): boolean;
  keyboard: KeyboardLayout;
  keyId(ch: string): string;
  charDescription: string;
}
