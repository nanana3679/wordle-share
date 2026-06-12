import { describe, it, expect } from 'vitest';
import { checkThreadVisibility } from './comment-gate';

const TODAY = '2026-06-12';
const YESTERDAY = '2026-06-11';
const TOMORROW = '2026-06-13';

describe('checkThreadVisibility — 게이트 룰 매트릭스 (ADR 0007, AC)', () => {
  it('과거 thread는 풀이 이력 무관 항상 공개', () => {
    for (const status of [null, 'in_progress', 'completed', 'failed']) {
      expect(checkThreadVisibility(YESTERDAY, TODAY, status)).toEqual({ visible: true });
    }
  });

  it('오늘 thread는 데일리 종료(솔브) 후 공개', () => {
    expect(checkThreadVisibility(TODAY, TODAY, 'completed')).toEqual({ visible: true });
  });

  it('오늘 thread는 시도 소진/포기(failed)도 공개 — 더 플레이할 수 없어 스포 무관', () => {
    expect(checkThreadVisibility(TODAY, TODAY, 'failed')).toEqual({ visible: true });
  });

  it('오늘 thread는 미풀이/진행 중이면 잠금', () => {
    expect(checkThreadVisibility(TODAY, TODAY, null)).toEqual({
      visible: false,
      reason: 'today_locked',
    });
    expect(checkThreadVisibility(TODAY, TODAY, 'in_progress')).toEqual({
      visible: false,
      reason: 'today_locked',
    });
  });

  it('미래 thread는 무조건 차단 — 풀이 상태를 위조해도 룰 3이 우선 (AC future block)', () => {
    // Sydney 사용자가 2026-06-13 thread를 먼저 작성해도 KST 2026-06-12 reader에겐 비공개
    for (const status of [null, 'in_progress', 'completed', 'failed']) {
      expect(checkThreadVisibility(TOMORROW, TODAY, status)).toEqual({
        visible: false,
        reason: 'future',
      });
    }
  });
});
