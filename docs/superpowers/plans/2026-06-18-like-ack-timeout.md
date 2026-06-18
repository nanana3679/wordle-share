# Like Ack Timeout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 좋아요 UI는 즉시 반응시키되, 서버 write는 in-flight 요청 1개로 제한하고 ack timeout/retry 후 최종 실패 시 올바른 서버 기준 상태로 롤백한다.

**Architecture:** `LikeButton`은 `latestDesiredRef`(현재 사용자의 최신 의도), `serverKnownRef`(마지막 ack 기준 liked 상태), `inFlightRef`(응답 대기 중인 서버 write)를 분리한다. 클릭은 ref/UI/cache를 동기적으로 바꾸고, debounce 후 in-flight가 없을 때만 `setLike(desired)`를 보낸다. ack 또는 timeout/retry 종료 후 `serverKnownRef.current !== latestDesiredRef.current`이면 다음 desired를 다시 전송해 최종 상태로 수렴한다. 표시 count는 ADR 0017에 따라 `otherLikesBaseline + (latestDesired ? 1 : 0)`로 계산하고, 서버 ack의 `likeCount`로 즉시 덮어쓰지 않는다.

**Tech Stack:** Next.js Server Actions, React Query mutation, Supabase service-role client, Vitest, Playwright smoke test.

---

## File Map

- Modify: `components/LikeButton.tsx`
  - in-flight 요청 1개 제한
  - ack timeout wrapper
  - React state timing에 기대지 않는 `latestDesiredRef`/`serverKnownRef` 비교
  - 최종 실패 시 toast + `serverKnownRef` 롤백
  - terminal timeout/failure 후 best-effort 상태 재조회
- Modify: `lib/optimistic-like.ts`
  - snapshot rollback보다 마지막 서버 기준 liked rollback을 우선 사용
  - 표시 count는 reducer count가 아니라 `otherLikesBaseline + userLike` 공식이 담당
- Modify: `lib/optimistic-like.test.ts`
  - ack 후 반대 의도 재전송 조건
  - 최종 실패 시 서버 기준 롤백 조건
  - ack timeout 이후 retry 대상 error 경로
- Modify: `app/actions/like.ts`
  - `toggleLike(deckId, like)`를 desired-state 멱등 처리로 정리
  - `like=true`인데 이미 liked면 success
  - `like=false`인데 이미 liked row가 없어도 success
- Modify after implementation: `docs/feature/likes-flow.md`
  - 현재 문서는 `useOptimistic` 예시 중심이라 실제 React Query reducer 흐름으로 갱신

## Policy

- 이 이슈에서는 DB `version` 컬럼을 추가하지 않는다.
- 좋아요는 0/1 상태이므로 `setLike(true/false)` 멱등 처리와 최종 desired 재전송으로 수렴시킨다.
- `retry: 3`은 최초 시도 후 최대 3회 재시도(총 4 attempts)를 뜻한다.
- ack timeout은 "서버 변경 실패"가 아니라 "클라이언트가 ack를 받지 못함"으로 취급한다.
- `Promise.race` timeout은 server action을 취소하지 못한다. timeout된 원 요청의 late success는 완전히 판별할 수 없으므로 terminal failure 후 best-effort refetch/reconcile을 수행한다.
- 클라이언트 표시 count는 정확한 global count가 아니어도 된다. 표시값은 `otherLikesBaseline + (likedByMe ? 1 : 0)`로만 계산한다.
- 서버 ack/reconcile은 `likedByMe` 수렴에 집중한다. `likeCount`는 다음 page load/feed refetch 때 baseline 재계산에만 사용한다.
- in-flight 제한 범위는 mounted `LikeButton` instance다. 같은 deck의 버튼을 한 화면에 여러 개 동시에 mount하는 요구가 생기면 per-deck coordinator를 별도 설계한다.
- 중요한 write 모델에 필요한 optimistic lock/version/idempotency key는 별도 설계 범위다.

## Rejected Alternatives

- `serverKnownRef`를 `{ liked, count }`로 들고 `applyServerKnown(state, { liked, count })` helper를 추가하는 계획은 반려한다.
  - 이유: ADR 0017 기준으로 버튼 표시 count는 정확한 global count가 아니어도 된다.
  - 표시 count는 `otherLikesBaseline + userLike` 공식으로만 계산한다.
  - 서버 ack/reconcile의 `likeCount`를 즉시 반영하면 feed/search cache churn과 rollback 복잡도가 다시 커진다.
- 서버 ack의 `likeCount`로 버튼 표시 count를 즉시 덮어쓰는 계획은 반려한다.
  - 이유: 다른 사용자의 동시 좋아요까지 실시간 반영하려는 목표가 아니다.
  - `likeCount`는 다음 page load/feed refetch 때 새 baseline 계산에만 사용한다.
- 이 이슈에서 DB `version` 또는 operation-id를 추가하는 계획은 반려한다.
  - 이유: 좋아요는 낮은 중요도의 0/1 상태이고, 현재 목표는 사용자 반응성과 최종 desired 수렴이다.
  - 결제/문서 저장 같은 중요한 write에는 별도 optimistic lock/idempotency 설계가 필요하다.
- ack 전까지 버튼을 비활성화하는 계획은 반려한다.
  - 이유: 좋아요의 핵심 UX는 즉시 반응이다.
  - 서버 write만 in-flight 1개로 제한하고, UI/cache는 계속 낙관적으로 갱신한다.

## Task 1: Reducer Semantics

**Files:**
- Modify: `lib/optimistic-like.ts`
- Modify: `lib/optimistic-like.test.ts`

- [ ] **Step 1: Add a failing test for server-known rollback**

Add this test to `lib/optimistic-like.test.ts`:

```ts
it('최종 실패 시 최초 snapshot이 아니라 마지막 서버 기준 liked로 롤백한다', () => {
  let state = initialLikeState(false, 10);
  state = applyClick(state); // optimistic liked
  state = applyServerLiked(state, true); // first ack confirmed liked
  state = applyClick(state); // user now wants unliked

  state = applyServerLiked(state, true); // unlike failed after retries; server remains liked

  expect(state.liked).toBe(true);
  expect(state.snapshot).toBeNull();
});
```

- [ ] **Step 2: Run the focused reducer test**

Run: `TMPDIR=/tmp npm test -- lib/optimistic-like.test.ts`

Expected before implementation: the new expectation should expose whether server-known rollback is expressible with the helper API.

- [ ] **Step 3: Keep rollback liked-only**

Use `applyServerLiked(state, serverKnownLiked)` for final failure rollback in `LikeButton`.

Do not add count reconciliation to the reducer for this issue. `LikeButton` display should compute:

```ts
const displayCount = othersLikeCountBaseline + (state.liked ? 1 : 0);
```

Do not use `applyRollback` for mutation retry exhaustion, because `applyRollback` restores the first optimistic snapshot and can be stale after an earlier ack.

- [ ] **Step 4: Run the focused reducer test again**

Run: `TMPDIR=/tmp npm test -- lib/optimistic-like.test.ts`

Expected: PASS.

## Task 2: In-Flight Request Limit

**Files:**
- Modify: `components/LikeButton.tsx`

- [ ] **Step 1: Add refs for server/write coordination**

Add refs with these responsibilities:

```ts
const latestDesiredRef = useRef(initialLiked);
const serverKnownRef = useRef(initialLiked);
const inFlightRef = useRef<LikeMutationInput | null>(null);
const flushRef = useRef<() => void>(() => {});
```

- [ ] **Step 2: Change flush to skip while one request is in-flight**

`flush` should:

```ts
if (inFlightRef.current) return;

const desired = latestDesiredRef.current;
if (desired === serverKnownRef.current) {
  setState((prev) => clearPendingChange(prev));
  return;
}

const variables = {
  liked: desired,
  previousLiked: serverKnownRef.current,
  requestId: requestIdRef.current + 1,
};
requestIdRef.current = variables.requestId;
inFlightRef.current = variables;
likeMutation.mutate(variables);
```

- [ ] **Step 3: On ack, compare server-known with latest desired**

On mutation success:

```ts
serverKnownRef.current = variables.liked;
setState((prev) => (
  latestDesiredRef.current === serverKnownRef.current
    ? clearPendingChange(prev)
    : prev
));
```

On mutation settled:

```ts
if (variables.requestId !== inFlightRef.current?.requestId) return;
inFlightRef.current = null;
if (!debounceRef.current && latestDesiredRef.current !== serverKnownRef.current) {
  setTimeout(() => flushRef.current(), 0);
}
```

- [ ] **Step 4: Preserve optimistic UI on every click and clear debounce refs**

`handleClick` still calls `applyClick` and `syncFeedCache(next.liked)` immediately. It must also update `latestDesiredRef.current = next.liked` inside the state updater. The button should not be disabled while a request is in-flight.

When the debounce timer fires, clear the ref before flushing:

```ts
debounceRef.current = setTimeout(() => {
  debounceRef.current = null;
  flushRef.current();
}, LIKE_DEBOUNCE_MS);
```

Assign `flushRef.current = flush` every render or in an effect so `onSettled` calls the latest flush function.

## Task 3: Ack Timeout and Retry

**Files:**
- Modify: `components/LikeButton.tsx`

- [ ] **Step 1: Define an ack timeout constant**

Add a local constant near `LIKE_DEBOUNCE_MS` usage:

```ts
const LIKE_ACK_TIMEOUT_MS = 5000;
```

- [ ] **Step 2: Wrap the server action with timeout**

Add a helper in `components/LikeButton.tsx`:

```ts
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("좋아요 응답 시간이 초과되었습니다.")), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
```

- [ ] **Step 3: Make timeout participate in React Query retry**

Use the helper in `mutationFn`:

```ts
const result = await withTimeout(toggleLike(deckId, liked), LIKE_ACK_TIMEOUT_MS);
if (!result.success) {
  throw new Error(result.message);
}
return result.data;
```

Keep `retry: 3`.

- [ ] **Step 4: Roll back only after all retries fail**

In `onError`, for the latest in-flight request:

```ts
serverKnownRef.current = variables.previousLiked;
latestDesiredRef.current = variables.previousLiked;
setState((prev) => {
  const next = applyServerLiked(prev, variables.previousLiked);
  syncFeedCache(next.liked);
  return next;
});
toast.error(error instanceof Error ? error.message : t("networkError"));
```

If `latestDesiredRef.current !== variables.liked`, skip rollback/toast and let `onSettled` send the current latest desired if needed.

- [ ] **Step 5: Reconcile after terminal timeout/failure**

After terminal failure, call `getLikeStatus(deckId)` with the same timeout as a best-effort reconcile. If it succeeds, update `serverKnownRef` with the returned liked truth. Adopt that server truth into `latestDesiredRef` and local UI only when no newer local intent appeared while reconcile was pending; otherwise keep the user's latest desired and schedule a follow-up flush. Do not overwrite the button display count with `likeCount`; keep `otherLikesBaseline + userLike` until the next page load/feed refetch recomputes the baseline. If reconcile also fails, keep the rollback and let the next navigation/refetch repair eventual drift.

## Task 4: Server Desired-State Idempotence

**Files:**
- Modify: `app/actions/like.ts`

- [ ] **Step 1: Treat already-liked as desired success**

For `like=true`, if legacy claim or insert hits `PG_UNIQUE_VIOLATION`, call `currentStatus`. If `status?.liked === true`, return success with that status instead of conflict.

- [ ] **Step 2: Treat already-unliked as desired success**

For `like=false`, a delete that affects no rows is still success. Keep the final `currentStatus` return path.

- [ ] **Step 3: Preserve hidden-deck conflict**

Do not change the hidden deck branch. Hidden deck should still return `success: false, conflict: true`.

## Task 5: Verification

**Files:**
- Modify: `docs/feature/likes-flow.md`
- Modify: `lib/optimistic-like.test.ts`

- [ ] **Step 1: Update the feature document**

Replace the `useOptimistic` example with this concise flow:

```text
click -> optimistic UI/cache update
count -> otherLikesBaseline + userLike
debounce -> send setLike(desired) only if no in-flight request
ack -> update serverKnown
serverKnown != latestDesired -> send latest desired again
ack timeout -> React Query retry
all retries failed -> toast + rollback to serverKnown
terminal timeout/failure -> best-effort getLikeStatus reconcile
```

- [ ] **Step 2: Add a callback-ordering regression test**

Add a pure regression test that models this order without React rendering:

```text
initial unliked
click like -> latestDesired true, send like=true
click unlike while request in-flight -> latestDesired false, do not send
ack like=true -> serverKnown true
settled -> latestDesired false differs, next flush sends like=false
final failure of like=false -> rollback to serverKnown true
```

The assertion should prove the decision logic uses `latestDesiredRef`/`serverKnownRef` values, not a possibly stale React `stateRef.current`.

- [ ] **Step 3: Run unit tests**

Run: `TMPDIR=/tmp npm test -- lib/optimistic-like.test.ts lib/feed-query.test.ts`

Expected: PASS.

- [ ] **Step 4: Run full local checks**

Run:

```bash
npm run typecheck
npm run lint
TMPDIR=/tmp npm test
```

Expected: all PASS.

- [ ] **Step 5: Run build**

Run: `npm run build`

Expected: PASS. If the sandbox blocks Turbopack port binding, rerun with approved escalation and record that in the PR.
