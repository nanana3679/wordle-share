export const MAX_TAGS_PER_WORD = 5;
export const MAX_CATEGORY_NAME_LENGTH = 12;

export type CategoriesErrorTranslator = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

export interface CategoryNameValidation {
  isValid: boolean;
  error?: string;
}

export function makeValidateCategoryName(t: CategoriesErrorTranslator) {
  return function validateCategoryName(name: string): CategoryNameValidation {
    const trimmed = name.trim();
    if (!trimmed) {
      return { isValid: false, error: t("nameEmpty") };
    }
    if (trimmed.length > MAX_CATEGORY_NAME_LENGTH) {
      return {
        isValid: false,
        error: t("nameTooLong", { max: MAX_CATEGORY_NAME_LENGTH }),
      };
    }
    return { isValid: true };
  };
}

/**
 * 입력 카테고리 배열을 trim·dedupe·길이 검증 후 정규화한다.
 * 첫 등장 순서를 유지한다.
 */
export function normalizeCategories(
  input: unknown,
  t: CategoriesErrorTranslator,
): {
  ok: string[];
  errors: string[];
} {
  const errors: string[] = [];
  if (!Array.isArray(input)) {
    return { ok: [], errors: [t("listArrayRequired")] };
  }
  const validateCategoryName = makeValidateCategoryName(t);
  const seen = new Set<string>();
  const ok: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") {
      errors.push(t("itemMustBeString"));
      continue;
    }
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const validation = validateCategoryName(trimmed);
    if (!validation.isValid) {
      errors.push(validation.error ?? t("invalidName"));
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    ok.push(trimmed);
  }
  return { ok, errors };
}
