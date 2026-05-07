# 페이지 구조

신규 라우트 트리. SSR + 슬러그 + canonical 정책은 [SEO.md](../platform/SEO.md), [ADR 0012](../adr/0012-ssr-public-deck-pages.md) 참고.

## URL 트리

```
/                              메인 피드 (Hot 기본, SSR)
/?sort=likes                   좋아요순 탭
/?sort=new                     최신순 탭
/search?q=...                  검색 결과 (SSR)

/d/{deck_id}                   덱 상세 (canonical, SSR)
/d/{deck_id}/{slug}            슬러그 추가 → 301 to canonical
/d/{deck_id}/play              게임 페이지 (SPA, noindex)
/d/new                         덱 생성 폼
/d/{deck_id}/edit              덱 편집

/og/{deck_id}.png              동적 OG 이미지
/sitemap.xml                   자동 생성
/robots.txt                    /d/*/play disallow

/my                            "내 덱" 목록 (localStorage 기반)
```

## 페이지별 권한 / 인증

| 경로 | 접근 | 인증 |
|---|---|---|
| `/`, `/search`, `/d/{id}` | 모두 | 없음 |
| `/d/{id}/play` | 모두 | anon_id (자동) |
| `/d/new` | 모두 | nick+pw 입력 |
| `/d/{id}/edit` | nick+pw 일치자 | nick+pw 검증 |
| `/my` | 디바이스 본인 | localStorage 기반 |

## 페이지별 주요 컴포넌트

### `/` 메인 피드

- `FeedTabs` — Hot / 좋아요순 / 최신순
- `DeckCard` (좋아요 버튼 포함, 낙관적 UI)
- `SearchBar`
- 무한 스크롤 (cursor 기반)

### `/d/{deck_id}` 덱 상세 (허브)

- 메타: 이름, 제작자 닉, script, 단어 수, 좋아요 수
- `DailyCard` — 오늘의 데일리 시작 / 진행 중 / 완료 상태
- `ChallengeCard` — 잠금 / 미도전 / 진행중 / 완료
- `CommentThread` — (deck, today) 스레드 + 게이트
- `LikeButton`, `ShareButton`, `EditButton`(본인 한정), `ReportButton`

### `/d/{deck_id}/play` 게임

- mode 분기: daily / challenge (query param 또는 state)
- `GameBoard` — 격자, 가변 길이
- `Keyboard` — smart rendering (effective_alphabet 기반)
- `AttemptHistory`
- 라운드 시작 시 `(date, deck_version)` 캡처
- 결과 화면: "결과 클립보드 복사" 버튼

### `/d/new` 덱 생성

- 단일 폼: 이름, script, 단어 textarea, nick+pw
- **시뮬레이션 버튼** — 입력으로 1라운드 미리 플레이
- 게시 = 즉시 공유 링크 + 복사 버튼

### `/d/{deck_id}/edit` 덱 편집

- nick+pw 검증 게이트
- 단어 추가/비활성화 (soft-delete)
- 변경 시 `decks.version` increment
- 진행 중 라운드는 `deck_version` 캡처로 보호

### `/my` 내 덱

- localStorage `my_decks: [{deck_id, last_visited_at}]` 기반
- 디바이스 변경 시 손실 — 단 nick+pw 알면 직접 링크로 접근
- V2: 백업 코드 export/import

## 진입 플로우

```
[A] 메인 페이지 직접 방문
  → 메인 피드 (Hot/좋아요순/최신순) + 검색바
  → 덱 카드 클릭 → 덱 상세 페이지

[B] 공유 링크 클릭 (외부 채널)
  → 덱 상세 페이지 (허브)
      ├─ 데일리 카드 + 챌린지 카드
      ├─ 댓글 피드 (게이트 적용)
      ├─ 좋아요 버튼 + 카운트
      └─ 메타 + 공유/수정/신고
  → 게임 페이지 (data 또는 challenge mode)
      ├─ 첫 방문 = 튜토리얼 모달 (localStorage 감지)
      ├─ 튜토리얼 버튼 항상 노출
      └─ 풀이 완료 → 결과 화면 → 댓글 / 결과 복사
  → 첫 댓글 작성 시점에 nick+pw 입력 (이후 자동)
```

## V2 후보 페이지

- `/auth/upgrade` — 익명 세션 OAuth 업그레이드 (보류)
- `/d/{id}/archive` — 이전 데일리 archive 재플레이
- `/admin` — 운영자 모더레이션 대시보드 (필요시)

명시적으로 안 만드는 페이지:
- `/leaderboard` — 사용자 점수 랭킹 없음 ([ADR 0003](../adr/0003-no-public-user-leaderboard.md))
- `/login` — 회원가입/로그인 없음
