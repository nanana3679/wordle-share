// 낙관적 좋아요 상태 머신 (#48, ADR 0002)
// UI 의존 없는 순수 reducer로 분리해 성공/롤백/debounce 수렴을 단위 테스트한다.
//
// 흐름: 클릭 → 즉시 로컬 반영(snapshot 보관) → 200ms debounce 후 마지막
// desired 상태만 서버 전송 → 성공이면 서버 값으로 동기화, 409/실패면 snapshot 롤백.

export interface LikeState {
  liked: boolean;
  count: number;
  /** 전송 대기/진행 중인 낙관적 변경의 롤백 지점 */
  snapshot: { liked: boolean; count: number } | null;
}

export const LIKE_DEBOUNCE_MS = 200;

export function initialLikeState(liked: boolean, count: number): LikeState {
  return { liked, count, snapshot: null };
}

// 클릭: 즉시 토글 반영. 연타 중에도 snapshot은 최초 서버 확정값을 유지한다.
export function applyClick(state: LikeState): LikeState {
  return {
    liked: !state.liked,
    count: state.count + (state.liked ? -1 : 1),
    snapshot: state.snapshot ?? { liked: state.liked, count: state.count },
  };
}

// 서버 성공: 서버 값이 진실 — 마지막 상태가 서버 진실로 수렴한다.
export function applyServerConfirm(
  _state: LikeState,
  server: { liked: boolean; count: number },
): LikeState {
  return { liked: server.liked, count: server.count, snapshot: null };
}

// 409(이미 추천) 또는 재시도 후에도 실패: snapshot으로 롤백.
export function applyRollback(state: LikeState): LikeState {
  if (!state.snapshot) return state;
  return { liked: state.snapshot.liked, count: state.snapshot.count, snapshot: null };
}

// debounce 후 실제로 서버에 보낼 게 있는지 — 연타로 원위치면 전송 생략.
export function pendingDesired(state: LikeState): boolean | null {
  if (!state.snapshot) return null;
  return state.liked === state.snapshot.liked ? null : state.liked;
}
