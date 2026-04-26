export const MAX_TAGS_PER_WORD = 5;
export const MAX_CATEGORY_NAME_LENGTH = 12;

export interface CategoryNameValidation {
  isValid: boolean;
  error?: string;
}

export function validateCategoryName(name: string): CategoryNameValidation {
  const trimmed = name.trim();
  if (!trimmed) {
    return { isValid: false, error: "카테고리 이름은 비어있을 수 없습니다." };
  }
  if (trimmed.length > MAX_CATEGORY_NAME_LENGTH) {
    return {
      isValid: false,
      error: `카테고리 이름은 최대 ${MAX_CATEGORY_NAME_LENGTH}자까지 가능합니다.`,
    };
  }
  return { isValid: true };
}

/**
 * 입력 카테고리 배열을 trim·dedupe·길이 검증 후 정규화한다.
 * 첫 등장 순서를 유지한다.
 */
export function normalizeCategories(input: unknown): {
  ok: string[];
  errors: string[];
} {
  const errors: string[] = [];
  if (!Array.isArray(input)) {
    return { ok: [], errors: ["카테고리 목록은 배열이어야 합니다."] };
  }
  // UI(`TagPicker`)가 대소문자 무시 비교를 쓰므로 서버도 동일 정책을 적용한다.
  const seen = new Set<string>();
  const ok: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") {
      errors.push("카테고리는 문자열이어야 합니다.");
      continue;
    }
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const validation = validateCategoryName(trimmed);
    if (!validation.isValid) {
      errors.push(validation.error ?? "카테고리 이름이 올바르지 않습니다.");
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    ok.push(trimmed);
  }
  return { ok, errors };
}
