# E2E 스모크 (Playwright)

이슈 #66 [T10c]. 골든 패스 7개 시나리오를 실제 서버 액션 위에서 검증한다.

## 시나리오 ↔ 파일

| # | 시나리오 | 파일 |
| - | -------- | ---- |
| 1 | 익명 세션 자동 발급 → 메인 피드 진입 | `discovery.spec.ts` |
| 2 | 검색으로 덱 발견 → 덱 상세 진입 | `discovery.spec.ts` |
| 3 | 데일리 시작 → 풀이 완료 | `gameplay.spec.ts` |
| 4 | 챌린지 잠금 해제 → 시작 → perfect | `gameplay.spec.ts` |
| 5 | 댓글 작성 (nick + pw) | `social.spec.ts` |
| 6 | 좋아요 클릭 → 증가 → 새로고침 후 유지 | `social.spec.ts` |
| 7 | 결과 클립보드 복사 | `gameplay.spec.ts` |

## 결정적 정답 (one-word deck)

각 테스트는 `/d/new` 폼으로 **단어 1개짜리 latin 덱**을 만든다. `pickDailyWordId`가
`seed % 1` → 항상 그 단어를 고르므로, ADR 0008(라운드 종료 전 단어 비노출)을 깨지 않고도
테스트가 정답(`smoketest`)을 알 수 있다. 키 입력은 화면 키보드 클릭으로 수행한다
(물리 키 핸들러 없음).

## 실행

```bash
# 1. env 준비 (.env.local) — 아래 "환경변수" 참조
# 2. 브라우저 1회 설치
pnpm exec playwright install chromium
# 3. 실행 (dev 서버 자동 기동)
pnpm test:e2e
pnpm test:e2e:ui   # 디버그
```

이미 `pnpm dev`가 떠 있으면 재사용한다. 원격 환경 대상이면
`E2E_BASE_URL=https://...` 로 dev 서버 기동을 건너뛴다.

## 환경변수 분리 / 가드

라이브 Supabase가 필요하다. `NEXT_PUBLIC_SUPABASE_URL`이 없거나 `example.supabase.co`면
**모든 스펙이 자동 skip**된다 (`requireLiveSupabase`). 동일 판정을 `playwright.config.ts`가
공유해 미설정 시 dev 서버 기동도 생략한다.

| 변수 | 용도 |
| ---- | ---- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 가드 판정 + 클라이언트 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 액션(admin) |
| `IP_HASH_SALT` | 좋아요 IP 해시 (ADR 0002) |

좋아요는 클라이언트 IP가 있어야 한다. `next dev`는 IP를 전달하지 않으므로 config가
`x-forwarded-for` 헤더를 주입한다. 클립보드 시나리오는 config의 `clipboard-read/write`
권한에 의존한다.

## 현재 검증 상태 (블로킹)

> **이 환경에서는 실행 검증 불가.**
> 1) Supabase 프로젝트 일시정지 → 라이브 DB 없음.
> 2) 컨테이너 네트워크 정책상 `cdn.playwright.dev` 차단 → 브라우저 다운로드 불가.
>
> 스펙은 env 가드로 CI에서 안전하게 skip되며, Supabase 복구 + 브라우저 설치 후
> `pnpm test:e2e`로 검증해야 한다. (PR 체크리스트에 "Supabase 복구 후" 보류로 명시)
