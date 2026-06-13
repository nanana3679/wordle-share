# 보안 베이스라인

T11(#56) 보안 가드 정책. 구현은 `lib/security-headers.ts` · `middleware.ts` · `eslint.config.mjs` · `.github/dependabot.yml`.

## 보안 전제 — XSS = 인증 방어선

- ADR 0001 채택: 마찰 최소화를 위해 raw (nick, pw)를 **localStorage에 평문 저장**한다.
- 결과: 임의 스크립트가 실행되면(XSS) 저장된 자격증명이 그대로 탈취된다 → 덱/댓글 수정·삭제 가능.
- 따라서 **XSS 차단이 사실상 인증 방어선**이다. CSP·입력 이스케이프·의존성 감사는 옵션이 아니라 인증 무결성의 일부다.
- enumeration 차단(nick+pw로 자원 역검색 불가)으로 약한 pw 피해 범위를 추가 완화한다.

## 가드 룰 (박제)

1. `dangerouslySetInnerHTML` 기본 금지. ESLint `react/no-danger`(error)로 강제한다.
   - 불가피한 경우에만 sanitizer를 거친 뒤 라인 단위 `eslint-disable-next-line react/no-danger`로 명시 허용.
   - 현재 유일 사용처: `app/d/[id]/page.tsx`의 JSON-LD. `serializeJsonLd()`로 `<`를 이스케이프해 `</script>` 브레이크아웃을 차단한다.
2. 사용자 입력(nick·덱 이름·댓글)은 React 기본 escape로 렌더한다. 별도 HTML 삽입 금지.
3. 신규 inline `<script>`는 CSP nonce 없이는 동작하지 않는다. nonce는 `middleware.ts`가 발급, `headers().get('x-nonce')`로 읽는다.
4. third-party script(분석·광고·트래커) **미도입**. 도입 시 ADR로 trade-off 명시 + CSP `script-src`/`connect-src` allowlist 갱신.

## CSP

- `middleware.ts`가 요청별 nonce를 발급하고 `lib/security-headers.ts`의 `buildContentSecurityPolicy()`로 헤더를 구성한다.
- `script-src 'self' 'nonce-…' 'strict-dynamic'` — **unsafe-inline 미사용**. Next.js 하이드레이션 스크립트는 nonce로 통과.
- dev 한정 `'unsafe-eval'`(Turbopack HMR), prod 한정 `upgrade-insecure-requests`로 환경 분리.
- 베이스라인: `default-src 'self'` · `object-src 'none'` · `base-uri 'self'` · `form-action 'self'` · `frame-ancestors 'none'`.
- `connect-src`는 `'self'` + Supabase REST/Realtime(https·wss) 오리진만 허용.
- 정적 헤더: `X-Content-Type-Options: nosniff` · `X-Frame-Options: DENY` · `Referrer-Policy: strict-origin-when-cross-origin` · `Permissions-Policy`(camera/mic/geo 차단).
- CSP 위반은 별도 report endpoint 없이 브라우저 콘솔에 보고된다.

## 의존성 감사

- `.github/dependabot.yml`: npm + github-actions weekly. dev 의존성은 그룹화해 잡음 축소, 보안 패치는 항상 PR.
- 수동 확인: `pnpm audit`. 프로덕션 표면(`next` 등) 고위험 advisory는 즉시 패치 bump.
- 잔존 advisory 다수는 transitive dev 툴링(supabase CLI · tsx · playwright)으로 런타임 비노출 — 추적은 하되 빌드 게이트는 걸지 않는다.

## 인증 표면 요약

- 덱/댓글 자원 인증: 서버가 raw pw를 자원별 bcrypt `pw_hash`와 verify (ADR 0001).
- 디바이스 세션: Supabase Anonymous Auth, 첫 쓰기/플레이 시 lazy 발급.
- 좋아요 남용 방지: IP hash (ADR 0002).

## V2 후보

- Subresource Integrity (SRI)
- 보안 인시던트 대응 플레이북
- 백업 코드(디바이스 간 신원 이전) — localStorage 의존 탈피
- CSP report-uri/report-to 수집 엔드포인트
- 추가 rate limit (T0 수준 외)

## 참고

- [ADR 0001 — Anonymous Auth + nick/pw 신원](../adr/0001-anon-auth-and-nick-pw-identity.md)
- [TECH_STACK](../TECH_STACK.md)
