import type { ScriptId } from "./scripts/types";
import { assertKnownScript } from "./scripts/index";
import { normalizeWord, validateAllowedChars } from "./word-validation";

// 덱 단어 도메인 규칙 (ADR 0010):
// - word row는 영구 ID. 같은 text 재추가는 기존 row의 active toggle
// - count(active) >= 1 invariant는 DB CHECK 없이 이 레벨에서 enforce
// 순수 함수로 분리해 DB 없이 단위 테스트한다.

export interface DeckWordRow {
  id: string;
  text: string;
  active: boolean;
}

export interface WordUpdatePlan {
  toInsert: string[];
  toReactivateIds: string[];
  toDeactivateIds: string[];
}

export type WordsValidation =
  | { ok: true; words: string[] }
  | { ok: false; message: string; invalidLines: string[] };

export type PlanResult =
  | { ok: true; plan: WordUpdatePlan }
  | { ok: false; message: string };

export const MIN_ACTIVE_WORDS = 1;

// 줄 단위 입력을 canonical form으로 정규화·검증·dedupe한다.
// requireMin이 true면 유효 단어 0개를 에러로 처리한다 (덱 생성 경로).
// 덱 로드/검증 경계에서 호출되므로 미등록 script id는 hard-fail한다 (assertKnownScript).
export function parseWordLines(
  raw: string,
  scriptId: ScriptId,
  { requireMin = true }: { requireMin?: boolean } = {},
): WordsValidation {
  // 덱 load/validate 경계 guard: 미등록 script id는 여기서 throw한다.
  // getScriptAdapter와 달리 silent fallback하지 않는다.
  assertKnownScript(scriptId);

  const invalidLines: string[] = [];
  const seen = new Set<string>();
  const words: string[] = [];

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const normalized = normalizeWord(trimmed);
    if (!validateAllowedChars(normalized, scriptId)) {
      invalidLines.push(trimmed);
      continue;
    }
    if (seen.has(normalized)) continue; // 정규화 후 중복은 조용히 dedupe
    seen.add(normalized);
    words.push(normalized);
  }

  if (invalidLines.length > 0) {
    return {
      ok: false,
      message: `허용되지 않는 문자가 포함된 단어가 있습니다: ${invalidLines.join(", ")}`,
      invalidLines,
    };
  }
  if (requireMin && words.length < MIN_ACTIVE_WORDS) {
    return { ok: false, message: "최소 1개 단어 필요", invalidLines: [] };
  }
  return { ok: true, words };
}

// 단어 추가/비활성화 요청을 insert/reactivate/deactivate 계획으로 변환한다.
// addTexts는 canonical form 전제. 같은 row가 추가·비활성화에 동시에 걸리면 추가가 이긴다.
export function planWordUpdate(
  existing: DeckWordRow[],
  addTexts: string[],
  deactivateIds: string[],
): PlanResult {
  const byText = new Map(existing.map((w) => [w.text, w]));
  const byId = new Map(existing.map((w) => [w.id, w]));

  const toInsert: string[] = [];
  const reactivate = new Set<string>();

  for (const text of new Set(addTexts)) {
    const row = byText.get(text);
    if (!row) {
      toInsert.push(text);
    } else if (!row.active || deactivateIds.includes(row.id)) {
      reactivate.add(row.id); // 재추가 = active toggle (영구 ID 유지)
    }
    // 이미 active이고 비활성화 대상도 아니면 no-op
  }

  const toDeactivateIds = deactivateIds.filter((id) => {
    const row = byId.get(id);
    return row !== undefined && row.active && !reactivate.has(id);
  });

  const activeAfter =
    existing.filter((w) => w.active).length -
    toDeactivateIds.length +
    reactivate.size -
    [...reactivate].filter((id) => byId.get(id)?.active).length +
    toInsert.length;

  if (activeAfter < MIN_ACTIVE_WORDS) {
    return {
      ok: false,
      message: "마지막 활성 단어는 비활성화할 수 없습니다. 활성 단어가 최소 1개 필요합니다.",
    };
  }

  return {
    ok: true,
    plan: { toInsert, toReactivateIds: [...reactivate], toDeactivateIds },
  };
}

// PUT 멱등 동기화 (ADR 0011): desired 단어 집합과 기존 row를 diff한다.
// - desired에만 있는 text → insert
// - 기존 inactive인데 desired에 있는 text → reactivate (영구 ID 유지, ADR 0010)
// - 기존 active인데 desired에 없는 text → deactivate (soft-delete)
// 같은 요청을 두 번 적용하면 두 번째는 전부 no-op이 된다 (멱등성).
export function planWordSync(
  existing: DeckWordRow[],
  desiredTexts: string[],
): PlanResult {
  const desired = new Set(desiredTexts);
  if (desired.size < MIN_ACTIVE_WORDS) {
    return { ok: false, message: "최소 1개의 활성 단어가 필요합니다." };
  }

  const byText = new Map(existing.map((w) => [w.text, w]));
  const toInsert = [...desired].filter((text) => !byText.has(text));
  const toReactivateIds = existing
    .filter((w) => !w.active && desired.has(w.text))
    .map((w) => w.id);
  const toDeactivateIds = existing
    .filter((w) => w.active && !desired.has(w.text))
    .map((w) => w.id);

  return { ok: true, plan: { toInsert, toReactivateIds, toDeactivateIds } };
}
