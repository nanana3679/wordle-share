import { describe, it, expect } from 'vitest';
import { escapeLikePattern, normalizeSearchQuery, SEARCH_QUERY_MAX_LENGTH } from './search';

describe('escapeLikePattern — 검색 매칭 안전성 (AC)', () => {
  it('ILIKE 메타문자를 이스케이프한다', () => {
    expect(escapeLikePattern('100%')).toBe('100\\%');
    expect(escapeLikePattern('a_b')).toBe('a\\_b');
    expect(escapeLikePattern('back\\slash')).toBe('back\\\\slash');
  });

  it('일반 키워드는 그대로 둔다', () => {
    expect(escapeLikePattern('원피스')).toBe('원피스');
  });
});

describe('normalizeSearchQuery', () => {
  it('trim 후 비어있으면 null', () => {
    expect(normalizeSearchQuery('  ')).toBeNull();
    expect(normalizeSearchQuery('')).toBeNull();
  });

  it('최대 길이를 강제한다', () => {
    expect(normalizeSearchQuery('a'.repeat(100))).toHaveLength(SEARCH_QUERY_MAX_LENGTH);
  });

  it('정상 키워드는 trim해서 반환', () => {
    expect(normalizeSearchQuery(' 포켓몬 ')).toBe('포켓몬');
  });
});
