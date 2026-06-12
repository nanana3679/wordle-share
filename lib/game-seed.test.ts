import { describe, it, expect } from 'vitest';
import {
  hashSeed,
  dailySeed,
  pickDailyWordId,
  maxAttemptsForLength,
} from './game-seed';

describe('hashSeed / dailySeed — 결정성 (AC)', () => {
  it('같은 입력은 항상 같은 시드를 낸다', () => {
    expect(hashSeed('deck-1:2026-06-12')).toBe(hashSeed('deck-1:2026-06-12'));
    expect(dailySeed('deck-1', '2026-06-12')).toBe(dailySeed('deck-1', '2026-06-12'));
  });

  it('deck/date/salt가 다르면 다른 시드를 낸다', () => {
    const base = dailySeed('deck-1', '2026-06-12');
    expect(dailySeed('deck-2', '2026-06-12')).not.toBe(base);
    expect(dailySeed('deck-1', '2026-06-13')).not.toBe(base);
    // 챌린지 시드는 데일리와 별개 (ADR 0006: salt "endurance")
    expect(dailySeed('deck-1', '2026-06-12', 'endurance')).not.toBe(base);
  });

  it('unsigned 32-bit 범위를 보장한다 (음수 modulo 방지)', () => {
    for (const input of ['a', 'deck:2026-01-01', '한글덱:2026-12-31:endurance']) {
      const seed = hashSeed(input);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThanOrEqual(0xffffffff);
    }
  });
});

describe('pickDailyWordId', () => {
  it('시드가 같으면 같은 단어를 고른다', () => {
    const ids = ['w1', 'w2', 'w3', 'w4', 'w5'];
    const seed = dailySeed('deck-1', '2026-06-12');
    expect(pickDailyWordId(ids, seed)).toBe(pickDailyWordId(ids, seed));
  });

  it('배열 범위 안의 원소를 반환한다', () => {
    const ids = ['w1', 'w2', 'w3'];
    for (let day = 1; day <= 28; day++) {
      const seed = dailySeed('deck-1', `2026-06-${String(day).padStart(2, '0')}`);
      expect(ids).toContain(pickDailyWordId(ids, seed));
    }
  });

  it('빈 배열이면 throw한다 (min-1-active invariant 위반)', () => {
    expect(() => pickDailyWordId([], 1)).toThrow();
  });
});

describe('maxAttemptsForLength — 글자수+1, 5~8 클램프 (AC)', () => {
  it.each([
    [1, 5], // 1+1=2 → 5로 클램프
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 8],
    [8, 8], // 8+1=9 → 8로 클램프
    [20, 8],
  ])('글자수 %i → 시도 %i회', (length, expected) => {
    expect(maxAttemptsForLength(length)).toBe(expected);
  });
});
