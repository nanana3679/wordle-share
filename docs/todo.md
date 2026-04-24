# TODO 인덱스

완료된 기능은 `docs/feature/*.md`에, 이슈 복기는 `docs/issue/*.md`에 작성.
이 파일은 진행 중 / 예정 작업의 단일 진입점.
기여·PR 규모 가이드는 [CONTRIBUTING.md](./CONTRIBUTING.md).

## 개발 규칙

- shadcn 사용
- `*.tsx`는 파스칼, `*.ts`는 캐멀 케이스
- 스타일은 tailwind (css 파일 금지)
- 문서 한 편은 100줄 이하

## 구현된 기능 (참고)

- [앱바 레이아웃](./feature/appbar-layout-structure.md)
- [구글 로그인 플로우](./feature/google-login-flow.md)
- [좋아요 플로우](./feature/likes-flow.md)
- [덱 페이지네이션](./feature/deck-pagination.md) / [무한 스크롤](./feature/deck-infinite-scroll.md)
- [에러바운더리 비동기 에러 처리](./feature/errorboundary-async-error-handling.md)
- [메타데이터/OG 최적화](./feature/metadata-og-optimization.md)
- [AI 덱 생성 파이프라인](./feature/ai-deck-generation-pipeline.md)
- [익명 덱 작성](./feature/anonymous-deck-creation.md)

## 진행 예정 — 핵심 기능

- [ ] `decks.words` `text[]` → `jsonb` 마이그레이션 (AI 파이프라인 태그 저장)
- [ ] 익명 덱 수정·삭제 (비밀번호 프롬프트 모달, `updateDeck`/`deleteDeck` 익명 분기)
- [ ] 익명 덱 썸네일 업로드 (Storage RLS 설계 포함)
- [ ] 익명 생성 경로 레이트리밋/캡차 (IP·쿠키 기반, Upstash/Vercel KV 등)
- [ ] 이미지 업로드 시 용량 초과하면 자동 리사이징

## 진행 예정 — AI 파이프라인 후속

자세한 건 [ai-deck-generation-pipeline.md](./feature/ai-deck-generation-pipeline.md) 참고.

- [ ] `scripts/ai/upload-decks.ts` (익명 덱 + jsonb 완료 후)
- [ ] 플레이 페이지 태그 선택기 UI (난이도·범위 조절)
- [ ] 꼬들(한글)·히라가나 게임 모드 (자모 분리, 언어별 키보드)
- [ ] `deck_ai_metadata` sidecar 테이블 (AI 덱 통계/롤백)
- [ ] Vercel Cron으로 `propose-topics` 주 1회 자동화

## 진행 예정 — 커뮤니티 / 성장

- [ ] 댓글 테이블 + UI
- [ ] 유저 알림 테이블
- [ ] 신고하기 기능
- [ ] `/notice` 페이지 (공지사항)
- [ ] 다크모드 / 고대비 모드
- [ ] 하드 모드 (게임 난이도)
- [ ] 경쟁 모드 — **덱 전체 스코프로 시작** (덱 1개 = 리더보드 1개, 태그 필터는 캐주얼 전용). 세분화된 스코프별 리더보드·Wordle식 데일리 스코프는 후속 논의.
- [ ] 접근성(a11y) 전반 점검
- [ ] React Query 도입 범위 확장

## 지표 트래킹

- [ ] DAU/MAU — 전반 활성 수준
- [ ] 덱 플레이 횟수 — 핵심 기능 사용 빈도
- [ ] 신규 덱 생성 수 — 콘텐츠 생산자 규모
- [ ] 공유 URL 클릭률 — 바이럴 효과
- [ ] 로그인 사용자당 좋아요 수 — 참여도

## 비즈니스 로직 정의 필요

- [ ] 허용 특수문자 (덱 이름, 설명)
- [ ] 글자수 제한 (덱 이름, 설명, 단어)
