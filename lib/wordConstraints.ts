// 단어 제약 조건 헬퍼 함수들

import type { DeckWord } from "@/types/decks";
import type { ScriptAdapter } from "./scripts/types";

export interface WordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * 단일 단어의 유효성을 검사합니다.
 */
export function validateWord(word: string, adapter: ScriptAdapter): WordValidationResult {
  const errors: string[] = [];

  // 1글자 이상인지 확인
  if (!word || adapter.splitUnits(word).length < 1) {
    errors.push('단어는 1글자 이상이어야 합니다.');
    return { isValid: false, errors };
  }

  if (!adapter.isAllowedWord(word)) {
    errors.push(`단어는 ${adapter.charDescription}만 사용할 수 있습니다.`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 단어 배열의 유효성을 검사합니다.
 */
export function validateWords(words: string[], adapter: ScriptAdapter): WordValidationResult {
  const errors: string[] = [];

  if (!words || words.length === 0) {
    errors.push('최소 하나의 단어가 필요합니다.');
    return { isValid: false, errors };
  }

  // 각 단어의 개별 유효성 검사
  const individualErrors: string[] = [];
  const processedWords = new Set<string>();

  words.forEach((word, index) => {
    const trimmedWord = word.trim();

    if (!trimmedWord) {
      individualErrors.push(`${index + 1}번째 단어가 비어있습니다.`);
      return;
    }

    // 중복 검사
    const lowerWord = adapter.normalize(trimmedWord);
    if (processedWords.has(lowerWord)) {
      individualErrors.push(`"${trimmedWord}"는 중복된 단어입니다.`);
      return;
    }
    processedWords.add(lowerWord);

    // 개별 단어 유효성 검사
    const wordValidation = validateWord(trimmedWord, adapter);
    if (!wordValidation.isValid) {
      individualErrors.push(`${index + 1}번째 단어 "${trimmedWord}": ${wordValidation.errors.join(', ')}`);
    }
  });

  errors.push(...individualErrors);

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 단어를 정규화합니다.
 */
export function normalizeWord(word: string, adapter: ScriptAdapter): string {
  return adapter.normalize(word);
}

/**
 * 단어 배열을 정규화합니다 (중복 제거 포함).
 */
export function normalizeWords(words: string[], adapter: ScriptAdapter): string[] {
  const normalized = words
    .map(word => word.trim())
    .filter(word => word.length > 0)
    .map(word => adapter.normalize(word));

  // 중복 제거
  return Array.from(new Set(normalized));
}

/**
 * 단어 배열을 정규화하고 유효성을 검사합니다.
 */
export function processWords(words: string[], adapter: ScriptAdapter): {
  normalizedWords: string[];
  validation: WordValidationResult;
} {
  const normalizedWords = normalizeWords(words, adapter);
  const validation = validateWords(normalizedWords, adapter);

  return {
    normalizedWords,
    validation
  };
}

/**
 * CSV 형태의 문자열을 단어 배열로 변환하고 검증합니다.
 */
export function parseWordsString(wordsString: string, adapter: ScriptAdapter): {
  normalizedWords: string[];
  validation: WordValidationResult;
} {
  if (!wordsString || wordsString.trim() === '') {
    return {
      normalizedWords: [],
      validation: { isValid: false, errors: ['단어를 입력해주세요.'] }
    };
  }

  const words = wordsString
    .split(',')
    .map(word => word.trim())
    .filter(word => word.length > 0);

  return processWords(words, adapter);
}

/**
 * string[] 배열을 DeckWord[] 형태로 변환합니다 (태그 없음).
 */
export function toDeckWords(words: string[]): DeckWord[] {
  return words.map((word) => ({ word, tags: [] }));
}

/**
 * DeckWord[] 입력을 정규화하고 유효성을 검사합니다.
 * - 단어: adapter.isAllowedWord 통과만 허용, adapter.normalize로 정규화, 공백 제거, 중복 제거
 *   (먼저 등장한 항목의 태그 보존).
 * - 태그: trim 후 빈 문자열 제외.
 */
export function validateDeckWords(input: DeckWord[], adapter: ScriptAdapter): {
  ok: DeckWord[];
  errors: string[];
} {
  const errors: string[] = [];
  const seen = new Map<string, DeckWord>();

  if (!input || input.length === 0) {
    errors.push("최소 하나의 단어가 필요합니다.");
    return { ok: [], errors };
  }

  input.forEach((entry, index) => {
    const rawWord = (entry?.word ?? "").trim();
    if (!rawWord) {
      errors.push(`${index + 1}번째 단어가 비어있습니다.`);
      return;
    }

    const validation = validateWord(rawWord, adapter);
    if (!validation.isValid) {
      errors.push(
        `${index + 1}번째 단어 "${rawWord}": ${validation.errors.join(", ")}`,
      );
      return;
    }

    const normalizedWord = adapter.normalize(rawWord);
    const rawTags = entry?.tags;
    if (rawTags !== undefined && rawTags !== null && !Array.isArray(rawTags)) {
      errors.push(
        `${index + 1}번째 단어 "${rawWord}": tags 필드는 배열이어야 합니다.`,
      );
      return;
    }
    const normalizedTags = Array.from(
      new Set(
        (rawTags ?? [])
          .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
          .filter((tag) => tag.length > 0),
      ),
    );

    if (seen.has(normalizedWord)) {
      // 중복 단어는 무시 (먼저 등장한 항목의 태그를 유지)
      return;
    }

    seen.set(normalizedWord, { word: normalizedWord, tags: normalizedTags });
  });

  return { ok: Array.from(seen.values()), errors };
}

/**
 * 단어가 게임에 적합한지 확인합니다 (추가 게임 관련 제약 조건).
 */
export function validateWordForGame(
  word: string,
  adapter: ScriptAdapter,
  minLength: number = 3,
  maxLength: number = 10
): WordValidationResult {
  const errors: string[] = [];

  // 기본 유효성 검사
  const basicValidation = validateWord(word, adapter);
  if (!basicValidation.isValid) {
    return basicValidation;
  }

  // 길이 검사
  const unitLength = adapter.splitUnits(word).length;
  if (unitLength < minLength) {
    errors.push(`단어는 최소 ${minLength}글자 이상이어야 합니다.`);
  }

  if (unitLength > maxLength) {
    errors.push(`단어는 최대 ${maxLength}글자까지 가능합니다.`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 단어 배열이 게임에 적합한지 확인합니다.
 */
export function validateWordsForGame(
  words: string[],
  adapter: ScriptAdapter,
  minLength: number = 3,
  maxLength: number = 10
): WordValidationResult {
  const errors: string[] = [];

  // 기본 유효성 검사
  const basicValidation = validateWords(words, adapter);
  if (!basicValidation.isValid) {
    return basicValidation;
  }

  // 각 단어의 게임 적합성 검사
  words.forEach((word, index) => {
    const gameValidation = validateWordForGame(word, adapter, minLength, maxLength);
    if (!gameValidation.isValid) {
      errors.push(`${index + 1}번째 단어 "${word}": ${gameValidation.errors.join(', ')}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}
