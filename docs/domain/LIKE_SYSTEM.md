# 좋아요 시스템

메인 피드 디스커버리 시그널. **IP 단독 식별** + **낙관적 UI**.

## 식별 모델

- PK = `(deck_id, ip_hash)`
- `ip_hash = SHA-256(ip + 고정_salt)`. salt 영구 고정 (회전 시 모든 좋아요 무효)
- 한 IP = 한 덱당 1좋아요. 영구 (취소는 가능)
- 풀이 무관, 누구나 가능 — 메인 피드 둘러보다 누를 수 있음
- 댓글 게이트와 별개 — 댓글은 풀이 게이트, 좋아요는 게이트 없음

관련 ADR: [0002](../adr/0002-ip-hash-for-likes.md)

## 위협 모델

- 좋아요 spam은 1인이 N개 콘텐츠에 영향 미치려면 N배 액션 필요 — 진짜 사용자 합산 대비 노이즈 작음 (집단 시그널 robustness)
- VPN 사이클 spam 가능하지만 메인 피드 정렬에 미치는 영향 미미
- NAT/CGN false-negative ("이미 추천한 IP입니다") 발생 — 한국 사용자에게 친숙한 패턴
- 사용자 점수 cheating과 다른 위협 모델 — [0004](../adr/0004-content-likes-vs-user-scores-threat-model.md) 참고

## 낙관적 인터랙션

```
클릭 → UI 즉시 반영 (liked: true, count: count+1)
    → 서버 요청 async fire-and-confirm
    → 200 + 새 like_count: 클라이언트 카운트 서버 값으로 동기화
    → 409 (이미 추천한 IP): 롤백 + 토스트 "이미 추천한 IP입니다"
    → 네트워크 실패: 1회 재시도 후 롤백 + 토스트
```

- 취소(unlike): 동일 패턴 (즉시 UI 반영 → 서버 confirm)
- 빠른 like/unlike 반복: debounce 200ms. 마지막 클릭 상태가 서버 진실로 수렴
- 모바일/저속 네트워크에서도 즉각 반응 — 메인 피드 스크롤 UX 핵심

## like_count 동기화

- `Deck.like_count`는 캐시 컬럼 (정렬 빠름)
- DB 트리거: `Like` insert/delete 시 자동 increment/decrement
- 메인 피드 sort by `Deck.like_count` (Hot 알고리즘에도 사용)

## 댓글 좋아요는 V2

- MVP에선 덱 좋아요만
- V2: 댓글에 이모지 리액션 (제한 셋: 👍 🔥 😂)으로 도입 검토

## 콘텐츠 랭킹은 별개

- "사용자 점수 랭킹 없음"([0003](../adr/0003-no-public-user-leaderboard.md))과 분리
- 콘텐츠 좋아요 랭킹은 cheating-resistant 충분 → Hot 피드/좋아요순 도입 OK
