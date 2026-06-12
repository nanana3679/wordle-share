# 메인 피드 + 검색

공개 디스커버리 채널. 신규 진입자가 IP 덱을 발견하는 첫 화면.

## 메인 피드 — 3개 탭

URL: `/`, `/?sort=likes`, `/?sort=new`

### Hot (기본 탭)

Reddit식 시간 가중 정렬:

```
score = log10(max(likes, 1)) + (created_at - reference_time) / time_decay_constant
```

- 좋아요 수 + 신선도 균형 — 오래된 인기 덱이 영구 점령 안 함
- 정확한 상수는 운영하며 튜닝 (Reddit 원공식 참고)
- Materialized view 또는 정기 cron으로 score 갱신 (분 단위)

### 좋아요순

- 누적 `Deck.like_count` 단순 정렬 (DESC)
- 올타임 인기

### 최신순

- `Deck.created_at` 또는 `Deck.updated_at` 정렬 (DESC)
- 신규 덱 노출 채널 — 공급 사이드 부스트

## 검색

URL: `/search?q=...`

- **덱 이름 키워드 매칭만**. 단어 내용 검색 X — 정답 누설 방지
- 형태소/유사어 매칭으로 "원피스" / "ONE PIECE" / "ワンピース" 같이 매칭
- 결과 정렬: 매칭 정확도 + 좋아요/Hot 점수 가중 혼합
- 빈 결과 시: "[{검색어}] 덱이 아직 없습니다. 만들어보세요" CTA → 공급 부스트

## 콘텐츠 노출 룰

- `Deck.hidden = true`는 피드/검색 제외 — 직접 링크는 접근 가능
  - 사유: 신고 누적 자동 가림 (5회) — [MODERATION](./MODERATION.md) 참고
- 운영자 시드 덱도 일반 덱과 동일 알고리즘 — 별도 큐레이션 슬롯 없음, 품질이면 자연 상위
- 검색·sitemap 모두 `hidden=true` 제외

## 페이지네이션

- 메인 피드: cursor 기반 무한 스크롤. 페이지당 20-30개
- 검색 결과: 마찬가지

## 좋아요 통합

- 카드별 좋아요 버튼 + 카운트 표시
- 클릭 시 낙관적 업데이트 — [LIKE_SYSTEM](./LIKE_SYSTEM.md) 참고
- 풀이 안 한 덱이라도 좋아요 가능

## SEO 통합

- 모든 피드 페이지는 SSR — [SEO](../platform/SEO.md) 참고
- 카드 그리드는 server-rendered HTML로 검색 엔진 인덱싱 가능
- 단어 내용은 절대 노출 X
