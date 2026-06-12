import { describe, it, expect } from 'vitest';
import { hotScore, sortByHotScore, HOT_DECAY_SECONDS } from './hot-score';

describe('hotScore — 결정성 (AC)', () => {
  it('같은 입력이면 항상 같은 점수', () => {
    expect(hotScore(10, '2026-06-12T00:00:00Z')).toBe(hotScore(10, '2026-06-12T00:00:00Z'));
  });

  it('좋아요는 로그 스케일로 가산된다 (10배 = +1점)', () => {
    const at = '2026-06-12T00:00:00Z';
    expect(hotScore(100, at) - hotScore(10, at)).toBeCloseTo(1, 10);
    expect(hotScore(1, at)).toBe(hotScore(0, at)); // max(likes, 1)
  });

  it('decay 초만큼 최신이면 +1점 (좋아요 10배와 등가)', () => {
    const base = new Date('2026-06-12T00:00:00Z');
    const later = new Date(base.getTime() + HOT_DECAY_SECONDS * 1000);
    expect(hotScore(10, later) - hotScore(10, base)).toBeCloseTo(1, 10);
  });
});

describe('sortByHotScore — 정렬 (AC)', () => {
  const deck = (id: string, like_count: number, created_at: string) => ({
    id,
    like_count,
    created_at,
  });

  it('좋아요와 최신성을 함께 반영해 내림차순 정렬한다', () => {
    const old = deck('old-popular', 1000, '2026-06-01T00:00:00Z');
    const fresh = deck('fresh-few', 5, '2026-06-12T00:00:00Z');
    // 11일 차이 = 950400s / 45000 ≈ 21.1점 > log10(1000/5) ≈ 2.3점 → 최신이 위
    expect(sortByHotScore([old, fresh]).map((d) => d.id)).toEqual(['fresh-few', 'old-popular']);
  });

  it('같은 시각이면 좋아요 많은 쪽이 위', () => {
    const a = deck('a', 3, '2026-06-12T00:00:00Z');
    const b = deck('b', 30, '2026-06-12T00:00:00Z');
    expect(sortByHotScore([a, b]).map((d) => d.id)).toEqual(['b', 'a']);
  });

  it('입력 배열을 변경하지 않는다', () => {
    const items = [deck('a', 1, '2026-06-12T00:00:00Z'), deck('b', 9, '2026-06-12T01:00:00Z')];
    const copy = [...items];
    sortByHotScore(items);
    expect(items).toEqual(copy);
  });
});
