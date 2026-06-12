import { describe, it, expect } from 'vitest';
import {
  challengeSeed,
  deterministicShuffle,
  isChallengeUnlocked,
} from './challenge';
import { dailySeed } from './game-seed';

describe('challengeSeed', () => {
  it('데일리 시드와 다르다 (salt "endurance" — ADR 0006)', () => {
    expect(challengeSeed('deck-1', '2026-06-12')).not.toBe(dailySeed('deck-1', '2026-06-12'));
  });

  it('같은 입력이면 항상 같다', () => {
    expect(challengeSeed('deck-1', '2026-06-12')).toBe(challengeSeed('deck-1', '2026-06-12'));
  });
});

describe('deterministicShuffle — 셔플 결정성 (AC)', () => {
  const ids = Array.from({ length: 50 }, (_, i) => `w${i}`);

  it('같은 시드면 같은 순서다 — 두 사용자 같은 (deck, date) 보장', () => {
    const seed = challengeSeed('deck-1', '2026-06-12');
    expect(deterministicShuffle(ids, seed)).toEqual(deterministicShuffle(ids, seed));
  });

  it('원소를 잃거나 더하지 않는 순열이다', () => {
    const shuffled = deterministicShuffle(ids, 12345);
    expect([...shuffled].sort()).toEqual([...ids].sort());
    expect(shuffled).toHaveLength(ids.length);
  });

  it('다른 시드면 (높은 확률로) 다른 순서다', () => {
    expect(deterministicShuffle(ids, 1)).not.toEqual(deterministicShuffle(ids, 2));
  });

  it('입력 배열을 변경하지 않는다', () => {
    const original = [...ids];
    deterministicShuffle(ids, 999);
    expect(ids).toEqual(original);
  });

  it('원소 1개도 동작한다', () => {
    expect(deterministicShuffle(['only'], 7)).toEqual(['only']);
  });
});

describe('isChallengeUnlocked — 데일리 게이트 (ADR 0006, AC)', () => {
  it('데일리 솔브(completed) → 해제', () => {
    expect(isChallengeUnlocked('completed')).toBe(true);
  });

  it('시도 소진/포기(failed)도 완료로 인정 → 해제', () => {
    expect(isChallengeUnlocked('failed')).toBe(true);
  });

  it('진행 중이거나 라운드 미시작이면 잠금', () => {
    expect(isChallengeUnlocked('in_progress')).toBe(false);
    expect(isChallengeUnlocked(null)).toBe(false);
  });
});
