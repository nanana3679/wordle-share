import { describe, it, expect } from 'vitest';
import { checkRoundAction } from './game-lock';

describe('checkRoundAction — 낙관적 락 (ADR 0009)', () => {
  it('in_progress + version 일치 → 통과', () => {
    expect(checkRoundAction({ status: 'in_progress', version: 3 }, 3)).toEqual({ ok: true });
  });

  it('version 불일치 → version_conflict (멀티 탭 race)', () => {
    const result = checkRoundAction({ status: 'in_progress', version: 4 }, 3);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('version_conflict');
  });

  it('끝난 라운드는 version과 무관하게 finished', () => {
    for (const status of ['completed', 'failed']) {
      const result = checkRoundAction({ status, version: 3 }, 3);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('finished');
    }
  });

  it('status 검증이 version 검증보다 먼저다 (ADR 0009 검증 순서)', () => {
    const result = checkRoundAction({ status: 'completed', version: 5 }, 3);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('finished');
  });
});
