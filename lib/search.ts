// 덱 이름 키워드 검색 (#76) — 단어 내용 매칭은 의도적으로 없음 (ADR 0008)

export const SEARCH_QUERY_MAX_LENGTH = 50;

// ILIKE 패턴 메타문자 이스케이프 — 사용자 입력이 와일드카드로 해석되는 것 방지
export function escapeLikePattern(input: string): string {
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

export function normalizeSearchQuery(raw: string): string | null {
  const trimmed = raw.trim().slice(0, SEARCH_QUERY_MAX_LENGTH);
  return trimmed.length > 0 ? trimmed : null;
}
