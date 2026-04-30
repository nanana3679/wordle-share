// 단어 제약 조건 헬퍼 함수들

import type { DeckWord } from "@/types/decks";
import type { ScriptAdapter } from "./scripts/types";

export type ValidationTranslator = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

export interface WordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * 단일 단어의 유효성을 검사합니다.
 */
export function validateWord(
  word: string,
  adapter: ScriptAdapter,
  t: ValidationTranslator,
  charDescription: string,
): WordValidationResult {
  const errors: string[] = [];

  if (!word || adapter.splitUnits(word).length < 1) {
    errors.push(t("wordMinLength"));
    return { isValid: false, errors };
  }

  if (!adapter.isAllowedWord(word)) {
    errors.push(t("wordCharsOnly", { charDescription }));
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 단어 배열의 유효성을 검사합니다.
 */
export function validateWords(
  words: string[],
  adapter: ScriptAdapter,
  t: ValidationTranslator,
  charDescription: string,
): WordValidationResult {
  const errors: string[] = [];

  if (!words || words.length === 0) {
    errors.push(t("wordsMinOne"));
    return { isValid: false, errors };
  }

  const individualErrors: string[] = [];
  const processedWords = new Set<string>();

  words.forEach((word, index) => {
    const trimmedWord = word.trim();

    if (!trimmedWord) {
      individualErrors.push(t("wordEmptyAt", { index: index + 1 }));
      return;
    }

    const lowerWord = adapter.normalize(trimmedWord);
    if (processedWords.has(lowerWord)) {
      individualErrors.push(t("wordDuplicate", { word: trimmedWord }));
      return;
    }
    processedWords.add(lowerWord);

    const wordValidation = validateWord(trimmedWord, adapter, t, charDescription);
    if (!wordValidation.isValid) {
      individualErrors.push(
        t("wordError", {
          index: index + 1,
          word: trimmedWord,
          errors: wordValidation.errors.join(", "),
        }),
      );
    }
  });

  errors.push(...individualErrors);

  return {
    isValid: errors.length === 0,
    errors,
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
    .map((word) => word.trim())
    .filter((word) => word.length > 0)
    .map((word) => adapter.normalize(word));

  return Array.from(new Set(normalized));
}

/**
 * 단어 배열을 정규화하고 유효성을 검사합니다.
 */
export function processWords(
  words: string[],
  adapter: ScriptAdapter,
  t: ValidationTranslator,
  charDescription: string,
): {
  normalizedWords: string[];
  validation: WordValidationResult;
} {
  const normalizedWords = normalizeWords(words, adapter);
  const validation = validateWords(normalizedWords, adapter, t, charDescription);

  return {
    normalizedWords,
    validation,
  };
}

/**
 * CSV 형태의 문자열을 단어 배열로 변환하고 검증합니다.
 */
export function parseWordsString(
  wordsString: string,
  adapter: ScriptAdapter,
  t: ValidationTranslator,
  charDescription: string,
): {
  normalizedWords: string[];
  validation: WordValidationResult;
} {
  if (!wordsString || wordsString.trim() === "") {
    return {
      normalizedWords: [],
      validation: { isValid: false, errors: [t("wordInputRequired")] },
    };
  }

  const words = wordsString
    .split(",")
    .map((word) => word.trim())
    .filter((word) => word.length > 0);

  return processWords(words, adapter, t, charDescription);
}

/**
 * string[] 배열을 DeckWord[] 형태로 변환합니다 (태그 없음).
 */
export function toDeckWords(words: string[]): DeckWord[] {
  return words.map((word) => ({ word, tags: [] }));
}

/**
 * DeckWord[] 입력을 정규화하고 유효성을 검사합니다.
 */
export function validateDeckWords(
  input: DeckWord[],
  adapter: ScriptAdapter,
  t: ValidationTranslator,
  charDescription: string,
): {
  ok: DeckWord[];
  errors: string[];
} {
  const errors: string[] = [];
  const seen = new Map<string, DeckWord>();

  if (!input || input.length === 0) {
    errors.push(t("wordsMinOne"));
    return { ok: [], errors };
  }

  input.forEach((entry, index) => {
    const rawWord = (entry?.word ?? "").trim();
    if (!rawWord) {
      errors.push(t("wordEmptyAt", { index: index + 1 }));
      return;
    }

    const validation = validateWord(rawWord, adapter, t, charDescription);
    if (!validation.isValid) {
      errors.push(
        t("wordError", {
          index: index + 1,
          word: rawWord,
          errors: validation.errors.join(", "),
        }),
      );
      return;
    }

    const normalizedWord = adapter.normalize(rawWord);
    const rawTags = entry?.tags;
    if (rawTags !== undefined && rawTags !== null && !Array.isArray(rawTags)) {
      errors.push(t("tagsArray", { index: index + 1, word: rawWord }));
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
      return;
    }

    seen.set(normalizedWord, { word: normalizedWord, tags: normalizedTags });
  });

  return { ok: Array.from(seen.values()), errors };
}

/**
 * 단어가 게임에 적합한지 확인합니다.
 */
export function validateWordForGame(
  word: string,
  adapter: ScriptAdapter,
  t: ValidationTranslator,
  charDescription: string,
  minLength: number = 3,
  maxLength: number = 10,
): WordValidationResult {
  const errors: string[] = [];

  const basicValidation = validateWord(word, adapter, t, charDescription);
  if (!basicValidation.isValid) {
    return basicValidation;
  }

  const unitLength = adapter.splitUnits(word).length;
  if (unitLength < minLength) {
    errors.push(t("wordMinChars", { min: minLength }));
  }

  if (unitLength > maxLength) {
    errors.push(t("wordMaxChars", { max: maxLength }));
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 단어 배열이 게임에 적합한지 확인합니다.
 */
export function validateWordsForGame(
  words: string[],
  adapter: ScriptAdapter,
  t: ValidationTranslator,
  charDescription: string,
  minLength: number = 3,
  maxLength: number = 10,
): WordValidationResult {
  const errors: string[] = [];

  const basicValidation = validateWords(words, adapter, t, charDescription);
  if (!basicValidation.isValid) {
    return basicValidation;
  }

  words.forEach((word, index) => {
    const gameValidation = validateWordForGame(word, adapter, t, charDescription, minLength, maxLength);
    if (!gameValidation.isValid) {
      errors.push(
        t("wordError", {
          index: index + 1,
          word,
          errors: gameValidation.errors.join(", "),
        }),
      );
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}
