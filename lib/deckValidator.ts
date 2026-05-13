/**
 * 덱 검증을 위한 단일 진입점 모듈.
 * lib/wordConstraints.ts 및 lib/deckCategories.ts 의 검증 로직을 흡수하고,
 * 모든 반환값을 ValidationResult 형태로 통일한다.
 */

import type { DeckWord } from "@/types/decks";
import type { ScriptAdapter } from "./scripts/types";
import type { ScriptId } from "./scripts/types";
import { getScriptAdapter } from "./scripts";
import {
  validateWord,
  validateDeckWords as _validateDeckWords,
} from "./wordConstraints";
import {
  normalizeCategories,
  MAX_TAGS_PER_WORD,
} from "./deckCategories";

// 게임 플레이 가능 길이 제약 (서버와 클라이언트 공통)
export const GAME_MIN_WORD_LENGTH = 3;
export const GAME_MAX_WORD_LENGTH = 10;

export type ValidationResult = {
  ok: boolean;
  fieldErrors: Record<string, string[]>;
};

// ────────────────────────────────────────────────────────
// 세부 검증 헬퍼
// ────────────────────────────────────────────────────────

/**
 * DeckWord[] 배열을 검증하고 정규화된 단어 목록을 반환한다.
 * - 빈 단어 / 허용되지 않는 문자 / 중복 검사
 * - 게임 길이 제약 (최소 3글자, 최대 10글자) 적용
 */
export function validateWords(
  words: DeckWord[],
  scriptId: ScriptId
): ValidationResult & { normalizedWords?: DeckWord[] } {
  const adapter: ScriptAdapter = getScriptAdapter(scriptId);
  const errors: string[] = [];

  if (!words || words.length === 0) {
    return {
      ok: false,
      fieldErrors: { words: ["최소 하나의 단어가 필요합니다."] },
    };
  }

  // validateDeckWords 로 기본 검증 + 정규화
  const baseResult = _validateDeckWords(words, adapter);
  if (baseResult.errors.length > 0) {
    errors.push(...baseResult.errors);
  }

  // 게임 길이 제약 검사 (기본 검증 통과한 단어만 대상)
  const lengthErrors: string[] = [];
  for (const entry of baseResult.ok) {
    const unitLength = adapter.splitUnits(entry.word).length;
    if (unitLength < GAME_MIN_WORD_LENGTH) {
      lengthErrors.push(
        `"${entry.word}"는 최소 ${GAME_MIN_WORD_LENGTH}글자 이상이어야 합니다.`
      );
    } else if (unitLength > GAME_MAX_WORD_LENGTH) {
      lengthErrors.push(
        `"${entry.word}"는 최대 ${GAME_MAX_WORD_LENGTH}글자까지 가능합니다.`
      );
    }
  }
  errors.push(...lengthErrors);

  if (errors.length > 0) {
    return { ok: false, fieldErrors: { words: errors } };
  }

  return { ok: true, fieldErrors: {}, normalizedWords: baseResult.ok };
}

/**
 * 카테고리 배열을 검증하고 정규화된 카테고리 목록을 반환한다.
 */
export function validateCategories(
  categories: unknown[]
): ValidationResult & { normalizedCategories?: string[] } {
  const result = normalizeCategories(categories);
  if (result.errors.length > 0) {
    return { ok: false, fieldErrors: { categories: result.errors } };
  }
  return { ok: true, fieldErrors: {}, normalizedCategories: result.ok };
}

// ────────────────────────────────────────────────────────
// 메인 진입점
// ────────────────────────────────────────────────────────

/**
 * 덱 전체를 검증한다.
 * - name 필수 검사
 * - 단어 검증 (게임 길이 포함)
 * - 카테고리 검증
 * - 카테고리 팔레트에 없는 태그 제거 + 단어당 상한 적용
 *
 * 성공 시 fieldErrors 가 비어있고, normalizedWords / normalizedCategories 를 반환한다.
 */
export function validateDeck(draft: {
  name: string;
  words: DeckWord[];
  categories?: unknown[];
  scriptId: ScriptId;
}): ValidationResult & {
  normalizedWords?: DeckWord[];
  normalizedCategories?: string[];
} {
  const fieldErrors: Record<string, string[]> = {};

  // 1. 이름
  if (!draft.name || !draft.name.trim()) {
    fieldErrors.name = ["이름은 필수입니다."];
  }

  // 2. 단어
  const wordsResult = validateWords(draft.words, draft.scriptId);
  if (!wordsResult.ok) {
    Object.assign(fieldErrors, wordsResult.fieldErrors);
  }

  // 3. 카테고리
  const categoriesResult = validateCategories(draft.categories ?? []);
  if (!categoriesResult.ok) {
    Object.assign(fieldErrors, categoriesResult.fieldErrors);
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  // 4. 카테고리 팔레트에 없는 태그 제거 + 단어당 상한
  const allowed = new Set(categoriesResult.normalizedCategories ?? []);
  const filteredWords = (wordsResult.normalizedWords ?? []).map((w) => {
    const tags =
      allowed.size === 0
        ? []
        : Array.from(new Set(w.tags.filter((tag) => allowed.has(tag)))).slice(
            0,
            MAX_TAGS_PER_WORD
          );
    return { word: w.word, tags };
  });

  return {
    ok: true,
    fieldErrors: {},
    normalizedWords: filteredWords,
    normalizedCategories: categoriesResult.normalizedCategories,
  };
}
