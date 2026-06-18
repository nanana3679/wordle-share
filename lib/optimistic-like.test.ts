import { describe, it, expect } from 'vitest';
import {
  initialLikeState,
  applyClick,
  applyServerLiked,
  clearPendingChange,
  applyRollback,
  pendingDesired,
  pendingServerDesired,
  pendingLatestDesired,
  getLikeFlushDecision,
  canSyncInitialLikeState,
} from './optimistic-like';

describe('낙관적 좋아요 — 성공 시나리오 (AC)', () => {
  it('클릭 즉시 liked: true, count +1 반영', () => {
    const state = applyClick(initialLikeState(false, 10));
    expect(state.liked).toBe(true);
    expect(state.count).toBe(11);
    expect(pendingDesired(state)).toBe(true);
  });

  it('서버 200 반환 시 liked만 서버 값으로 확정한다', () => {
    let state = applyClick(initialLikeState(false, 10));
    state = applyServerLiked(state, true);
    expect(state).toEqual({ liked: true, count: 11, snapshot: null });
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

  it('재시도 최종 실패 시 최초 snapshot이 아니라 마지막 서버 ack 기준 liked로 롤백한다', () => {
    let state = initialLikeState(false, 10);
    state = applyClick(state); // like=true 요청
    state = applyServerLiked(state, true); // 서버가 liked를 ack
    state = applyClick(state); // unlike=false 요청

    state = applyServerLiked(state, true); // unlike 실패, 서버 기준은 liked 유지

    expect(state.liked).toBe(true);
    expect(state.snapshot).toBeNull();
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
    expect(clearPendingChange(state)).toEqual({ liked: false, count: 10, snapshot: null });
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

  it('요청 전송 직후 반대로 클릭하면 마지막 서버 목표와 비교해 다음 의도를 만든다', () => {
    let state = initialLikeState(false, 10);
    state = applyClick(state); // like 요청 전송 예정
    expect(pendingServerDesired(state, false)).toBe(true);

    state = applyClick(state); // like=true 요청이 이미 나간 직후 unlike
    expect(pendingDesired(state)).toBeNull();
    expect(pendingServerDesired(state, true)).toBe(false);
  });

  it('in-flight 중에는 새 요청을 보류하고 ack 후 최신 의도로 후속 전송한다', () => {
    let latestDesired = false;
    let serverKnown = false;
    let hasInFlight = false;

    latestDesired = true;
    expect(pendingLatestDesired(latestDesired, serverKnown, hasInFlight)).toBe(true);

    hasInFlight = true;
    latestDesired = false;
    expect(pendingLatestDesired(latestDesired, serverKnown, hasInFlight)).toBeNull();

    serverKnown = true; // like=true ack
    hasInFlight = false;
    expect(pendingLatestDesired(latestDesired, serverKnown, hasInFlight)).toBe(false);
  });

  it('in-flight 중 debounce flush는 pending marker를 clear하지 않고 defer한다', () => {
    expect(getLikeFlushDecision(false, true, true)).toEqual({ type: "defer" });
    expect(getLikeFlushDecision(false, true, false)).toEqual({ type: "send", liked: false });
    expect(getLikeFlushDecision(true, true, false)).toEqual({ type: "clear" });
  });

  it('in-flight 또는 미수렴 의도가 있으면 initial props sync를 보류한다', () => {
    const settled = initialLikeState(false, 10);
    const pending = applyClick(settled);

    expect(canSyncInitialLikeState(settled, false, false, false)).toBe(true);
    expect(canSyncInitialLikeState(settled, false, true, true)).toBe(false);
    expect(canSyncInitialLikeState(settled, false, true, false)).toBe(false);
    expect(canSyncInitialLikeState(pending, true, false, false)).toBe(false);
  });
});
