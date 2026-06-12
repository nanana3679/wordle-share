import type { ScriptId } from "@/lib/scripts/types";

// ADR 0014: Word 허용 문자 집합 + canonical form
// - 저장 텍스트는 normalizeWord를 거친 canonical form (NFC + lowercase)
// - script 알파벳: latin a-z / hangul 가-힣(완성형) / kana ぁ-ゖゝゞ(히라가나)
// - 공통 추가 허용: 0-9, -, ', .
// - 그 외(공백, 기호, 다른 script, control char)는 reject — 자동 변환하지 않는다
// 향후 문자 추가는 allowlist 한 줄 확장. 축소는 기존 Word 무효화라 어려움.

const SCRIPT_PATTERNS: Partial<Record<ScriptId, RegExp>> = {
  latin: /^[a-z0-9\-'.]+$/,
  hangul: /^[가-힣0-9\-'.]+$/,
  kana: /^[ぁ-ゖゝゞ0-9\-'.]+$/,
};

// NFC 정규화 + lowercase. 결정적(idempotent)이어야 dedupe/추측 매칭이 안정된다.
// lowercase는 latin 외 script에는 no-op이므로 script 무관하게 적용한다.
export function normalizeWord(text: string): string {
  return text.normalize("NFC").toLowerCase();
}

// canonical form(normalizeWord 결과)에 대한 허용 문자 검증.
// 정규화 전 텍스트(대문자, NFD 등)는 그대로 넣으면 reject될 수 있다 —
// 호출자는 normalizeWord를 먼저 적용해야 한다.
export function validateAllowedChars(text: string, scriptId: ScriptId): boolean {
  const pattern = SCRIPT_PATTERNS[scriptId];
  if (!pattern) return false;
  return pattern.test(text);
}
