import { describe, it, expect } from 'vitest';
import {
  initialLikeState,
  applyClick,
  applyServerConfirm,
  applyRollback,
  pendingDesired,
} from './optimistic-like';

describe('낙관적 좋아요 — 성공 시나리오 (AC)', () => {
  it('클릭 즉시 liked: true, count +1 반영', () => {
    const state = applyClick(initialLikeState(false, 10));
    expect(state.liked).toBe(true);
    expect(state.count).toBe(11);
    expect(pendingDesired(state)).toBe(true);
  });

  it('서버 200 + 새 like_count 반환 시 서버 값으로 동기화', () => {
    let state = applyClick(initialLikeState(false, 10));
    state = applyServerConfirm(state, { liked: true, count: 13 }); // 다른 IP 좋아요 누적 반영
    expect(state).toEqual({ liked: true, count: 13, snapshot: null });
  });
});

describe('낙관적 좋아요 — 롤백 시나리오 (AC)', () => {
  it('409(이미 추천) 시 클릭 전 상태로 롤백', () => {
    let state = applyClick(initialLikeState(false, 10));
    state = applyRollback(state);
    expect(state).toEqual({ liked: false, count: 10, snapshot: null });
  });

  it('네트워크 실패 롤백도 동일 경로', () => {
    let state = applyClick(initialLikeState(true, 5)); // unlike 시도
    expect(state.count).toBe(4);
    state = applyRollback(state);
    expect(state).toEqual({ liked: true, count: 5, snapshot: null });
  });

  it('대기 중 변경이 없으면 롤백은 no-op', () => {
    const state = initialLikeState(false, 10);
    expect(applyRollback(state)).toEqual(state);
  });
});

describe('낙관적 좋아요 — debounce 연타 수렴 (AC)', () => {
  it('like→unlike 연타로 원위치면 서버 전송을 생략한다', () => {
    let state = initialLikeState(false, 10);
    state = applyClick(state); // like
    state = applyClick(state); // unlike — 원위치
    expect(state.liked).toBe(false);
    expect(state.count).toBe(10);
    expect(pendingDesired(state)).toBeNull();
  });

  it('연타 후 최종 상태만 desired로 전송된다 (마지막 상태가 서버 진실로 수렴)', () => {
    let state = initialLikeState(false, 10);
    state = applyClick(state); // like
    state = applyClick(state); // unlike
    state = applyClick(state); // like — 최종
    expect(pendingDesired(state)).toBe(true);
    // snapshot은 최초 확정값 유지 → 실패 시 (false, 10)으로 정확히 롤백
    state = applyRollback(state);
    expect(state).toEqual({ liked: false, count: 10, snapshot: null });
  });
});
