import type { ScriptAdapter } from "./scripts/types";
import type { LetterState } from "./wordleGame";

// Smart keyboard 구성 (ADR 0014 hybrid rendering):
// - 기본 script 알파벳: adapter.keyboard의 고정 레이아웃 전체 표시 (누설 0)
// - 특수문자(0-9, -, ', .): DailyWord snapshot의 단어들에서 derive —
//   사용된 것만 표시한다. "이 덱/날짜에 하이픈 단어 있음" 수준의 약한 누설 감수.

const SPECIAL_CHARS = [..."0123456789-'."] as const;

export function deriveSpecialChars(snapshotWordTexts: readonly string[]): string[] {
  const present = new Set<string>();
  for (const text of snapshotWordTexts) {
    for (const ch of text) {
      if ((SPECIAL_CHARS as readonly string[]).includes(ch)) present.add(ch);
    }
  }
  return SPECIAL_CHARS.filter((ch) => present.has(ch));
}

// 시도 기록에서 키보드 키 상태를 derive한다 (correct > present > absent 우선순위)
export interface AttemptUnits {
  units: string[];
  states: LetterState[];
}

const STATE_PRIORITY: Record<string, number> = { absent: 1, present: 2, correct: 3 };

export function deriveKeyStates(
  attempts: readonly AttemptUnits[],
  adapter: ScriptAdapter,
): Record<string, LetterState> {
  const keyStates: Record<string, LetterState> = {};
  for (const attempt of attempts) {
    attempt.units.forEach((unit, i) => {
      const state = attempt.states[i];
      if (!unit || !state || state === "empty") return;
      const keyId = adapter.keyId(unit);
      const current = keyStates[keyId];
      if (!current || STATE_PRIORITY[state] > STATE_PRIORITY[current]) {
        keyStates[keyId] = state;
      }
    });
  }
  return keyStates;
}
