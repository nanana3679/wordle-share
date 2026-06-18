# 좋아요 흐름

## 목표

- 좋아요 버튼은 클릭 즉시 반응한다.
- 서버 write는 같은 버튼 instance 기준 in-flight 요청 1개만 허용한다.
- ack timeout/retry 후 최종 실패하면 마지막 서버 ack 기준 `likedByMe`로 롤백한다.
- 표시 count는 정확한 global count가 아니라 ADR 0017의 로컬 공식으로 계산한다.

## 상태

- `latestDesiredRef`: 사용자의 최신 liked 의도
- `serverKnownRef`: 마지막 ack 기준 서버 liked 상태
- `inFlightRef`: 아직 success/error/timeout 처리가 끝나지 않은 서버 요청
- `otherLikesBaseline`: 페이지 로드 시점의 내 좋아요 제외 count 기준값

## 표시 Count

```text
displayCount = otherLikesBaseline + (likedByMe ? 1 : 0)
```

- 서버 ack의 `likeCount`로 버튼 count를 즉시 덮어쓰지 않는다.
- 다음 page load/feed refetch 때 최신 `like_count`와 `likedByMe`로 baseline을 다시 계산한다.

## 클릭 흐름

```text
click
→ latestDesiredRef + optimistic UI/cache update
→ debounce
→ no in-flight && latestDesired != serverKnown 이면 setLike(latestDesired)
```

- 사용자가 in-flight 중 다시 누르면 UI/cache만 즉시 바꾼다.
- 새 서버 요청은 기존 요청의 ack/timeout 처리가 끝난 뒤 보낸다.

## Ack 흐름

```text
ack success
→ serverKnownRef 갱신
→ serverKnown != latestDesired 이면 최신 의도 재전송
```

- 성공 응답은 버튼 count를 덮어쓰지 않는다.
- 오래된 응답은 UI/cache를 직접 덮어쓰지 않는다.

## Timeout / 실패 흐름

```text
ack timeout
→ mutation error
→ React Query retry
→ retries exhausted
→ toast + rollback likedByMe to serverKnownRef
→ best-effort getLikeStatus reconcile
```

- timeout은 서버 write 취소가 아니라 "ack 미수신"이다.
- reconcile이 실패하면 다음 navigation/refetch가 eventual drift를 복구한다.

## 서버 액션

- `setLike(true)`는 이미 liked여도 success다.
- `setLike(false)`는 이미 unliked여도 success다.
- hidden deck conflict는 실패로 유지한다.
