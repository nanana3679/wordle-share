# 주요 기능

각 기능의 상세 룰·결정 근거는 도메인별 문서 또는 ADR 참고.

## 1. 신원 / 인증

3-layer 익명 모델:

- 디바이스 식별 = Supabase Anonymous Auth (`auth.uid()`)
- 자원 단위 인증 = 단일 (nick, pw) 쌍, bcrypt
- 좋아요 식별 = IP hash (salt 영구 고정)

회원가입/사회 로그인 없음. 디바이스 변경 시 nick+pw로 자기 자원 접근.

→ [architecture/IDENTITY_MODEL.md](../architecture/IDENTITY_MODEL.md), [ADR 0001](../adr/0001-anon-auth-and-nick-pw-identity.md), [ADR 0002](../adr/0002-ip-hash-for-likes.md)

## 2. 덱 관리 (UGC)

- 자유 이름 + script(roman/hangul/hiragana) + 단어 리스트
- 단어 영구 ID + soft-delete — 과거 풀이 기록 무결
- 자유 편집 (nick+pw 인증). 시즌 업데이트 흡수 가능
- 단어 수 하한 없음 — organic filtering
- 같은 IP에 여러 덱 허용 (UGC 정신)

→ [CONTEXT.md Deck/Word](../../CONTEXT.md), [ADR 0010](../adr/0010-word-soft-delete-with-permanent-ids.md), [ADR 0014](../adr/0014-word-character-set-and-canonical-form.md)

## 3. 게임 — 데일리 + 챌린지

- **데일리**: 매일 1단어. 시드 `hash(deck + date)`. client local date 기준
- **챌린지**: 1일 1회, 데일리 완료 게이트, 단어 시퀀스 연속 풀이
- 시도 = `글자수 + 1`, 5~8 클램프
- 추측 자동완성 X — IP 지식이 진입 장벽
- DailyWord에 `active_word_ids` snapshot 저장 → 자정/덱편집 무관. Round는 date만 캡처

→ [GAME_MECHANICS.md](./GAME_MECHANICS.md), [ADR 0005](../adr/0005-daily-and-challenge-modes.md), [ADR 0006](../adr/0006-challenge-daily-completion-gate.md), [ADR 0015](../adr/0015-round-state-capture.md)

## 4. 댓글 시스템

- (deck_id, thread_date) 단위 thread. 최신순 + 날짜 헤더
- 가림 룰: 과거 thread는 항상 공개, 오늘/미래는 본인 라운드 완료 시 열람
- 작성: nick+pw. 디바이스 무관 삭제. 편집 미지원
- 결과 공유는 클립보드 복사 → 사용자 직접 paste (자동 부착 X)

→ [domain/COMMENT_SYSTEM.md](../domain/COMMENT_SYSTEM.md), [ADR 0007](../adr/0007-comment-solve-gate.md)

## 5. 디스커버리 — 메인 피드 + 검색

- 메인 피드 3 탭: Hot / 좋아요순 / 최신순
- Hot 알고리즘 = Reddit식 시간 가중
- 검색: 덱 이름 매칭. 단어 내용 X (정답 누설 방지)
- 자동 가림된 덱은 피드/검색/sitemap 제외

→ [domain/FEED_AND_SEARCH.md](../domain/FEED_AND_SEARCH.md)

## 6. 좋아요

- (deck_id, ip_hash) PK. IP당 한 덱 1좋아요
- 풀이 무관, 누구나 가능 (디스커버리 시그널)
- 낙관적 UI — 즉시 반영 + 서버 confirm async

→ [domain/LIKE_SYSTEM.md](../domain/LIKE_SYSTEM.md), [ADR 0002](../adr/0002-ip-hash-for-likes.md), [ADR 0004](../adr/0004-content-likes-vs-user-scores-threat-model.md)

## 7. 모더레이션

- 신고 버튼 + 자동 임시 가림 (덱 5회 / 댓글 3회)
- 운영자 알림 + 수동 검토
- AI 모더레이션은 V2

→ [domain/MODERATION.md](../domain/MODERATION.md), [ADR 0013](../adr/0013-report-based-moderation-with-auto-hide.md)

## 8. SEO / 외부 공유

- 공개 페이지 SSR (메인 피드, 덱 상세, 검색)
- 게임 페이지 noindex (정답 누설 방지)
- 슬러그 URL → canonical 301
- OG 이미지 동적 생성 (`/og/{deck_id}.png`)
- 사이트맵 일별 갱신

→ [platform/SEO.md](../platform/SEO.md), [ADR 0012](../adr/0012-ssr-public-deck-pages.md)

## 9. 운영자 시드 도구

- 콜드 스타트용 long-tail IP 덱 자동 생성
- 일반 사용자 API 호출 (도그푸딩)
- 시즌/스토리 업데이트 시 PUT 지속 호출
- 공개 API/외부 onboarding 없음

→ [operations/OPERATOR_SEED_TOOL.md](../operations/OPERATOR_SEED_TOOL.md), [ADR 0011](../adr/0011-operator-seed-via-public-api.md)

## V2 후보

- 댓글 좋아요 / 이모지 리액션
- 자유 플레이 모드
- WebSocket 실시간 sync
- 백업 코드 export/import
- AI 모더레이션
- 비공개 덱 / 접근 코드 덱
- Tag 필터 UI ([ADR 0016](../adr/0016-defer-tags-to-v2.md))
