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
  /** Stable identifier for the Enter key, independent of display label (i18n-safe). */
  enterKeyId: string;
  /** Stable identifier for the Backspace key, independent of display label (i18n-safe). */
  backspaceKeyId: string;
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
