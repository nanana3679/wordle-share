import { describe, it, expect } from 'vitest';
import {
  reportThreshold,
  applyReport,
  DEFAULT_REPORT_THRESHOLDS,
} from './moderation';

describe('reportThreshold — 환경변수 임계치 (AC)', () => {
  it('기본값: 덱 5회, 댓글 3회 (ADR 0013)', () => {
    expect(reportThreshold('deck', {})).toBe(5);
    expect(reportThreshold('comment', {})).toBe(3);
  });

  it('환경변수로 코드 변경 없이 조정 가능', () => {
    expect(reportThreshold('deck', { REPORT_THRESHOLD_DECK: '10' })).toBe(10);
    expect(reportThreshold('comment', { REPORT_THRESHOLD_COMMENT: '1' })).toBe(1);
  });

  it('잘못된 값은 기본값으로 fallback', () => {
    expect(reportThreshold('deck', { REPORT_THRESHOLD_DECK: 'abc' })).toBe(
      DEFAULT_REPORT_THRESHOLDS.deck,
    );
    expect(reportThreshold('deck', { REPORT_THRESHOLD_DECK: '0' })).toBe(
      DEFAULT_REPORT_THRESHOLDS.deck,
    );
    expect(reportThreshold('deck', { REPORT_THRESHOLD_DECK: '-1' })).toBe(
      DEFAULT_REPORT_THRESHOLDS.deck,
    );
  });
});

describe('applyReport — 임계 도달 가림 (AC)', () => {
  it('임계 도달 시 hide', () => {
    expect(applyReport(4, 5)).toEqual({ newCount: 5, hide: true });
    expect(applyReport(2, 3)).toEqual({ newCount: 3, hide: true });
  });

  it('임계 미만이면 카운트만 증가', () => {
    expect(applyReport(0, 5)).toEqual({ newCount: 1, hide: false });
    expect(applyReport(3, 5)).toEqual({ newCount: 4, hide: false });
  });

  it('임계 초과 상태에서도 hide 유지 (멱등)', () => {
    expect(applyReport(7, 5)).toEqual({ newCount: 8, hide: true });
  });
});
