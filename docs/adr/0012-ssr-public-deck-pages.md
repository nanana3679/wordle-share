# 0012. 공개 페이지 SSR + 슬러그 + sitemap + OG

## Status

Accepted

## Context

공개 메인 피드/검색 도입으로 외부 검색 엔진·SNS가 디스커버리의 큰 부분을 차지한다 — 신규 진입자는 검색 결과·공유 미리보기로 들어온다. CSR 단일 페이지로는:

- 검색 엔진이 메타데이터를 인덱싱하기 어려움
- SNS 공유 미리보기(OG)가 누락됨
- 첫 페이지 렌더 성능 저하

동시에 **정답 누설 방지**가 필수 — 단어 내용은 SSR HTML/메타에도 절대 들어가면 안 됨.

## Decision

### 렌더링
- 공개 페이지(메인 피드, 덱 상세, 검색)는 **SSR/사전렌더링**
- 게임 페이지(`/d/[id]/play`)는 SPA로 동적 + `noindex`

### URL
```
/                           메인 피드 (Hot 기본)
/?sort=likes                좋아요순
/?sort=new                  최신순
/search?q=...               검색 결과
/d/{deck_id}                덱 상세 (canonical)
/d/{deck_id}/{slug}         슬러그 추가 → 301 to canonical
/d/{deck_id}/play           게임 (noindex)
```
- `deck_id`는 nanoid (안정적 키)
- 슬러그는 덱 이름 기반 (예: `원피스-덱`)

### 메타
- `<title>` / `<meta description>`: 단어 수·스크립트·제작자 nick (정답 누설 X)
- Open Graph: `/og/{deck_id}.png` 동적 이미지 (이름 + 단어 수 + 좋아요 수, 단어 내용 X)
- Twitter Card: `summary_large_image`
- Schema.org: `Game` 또는 `CreativeWork` JSON-LD

### sitemap / robots
- `/sitemap.xml`: 공개(가림되지 않은) 덱 일별 갱신
- `/robots.txt`: `Disallow: /d/*/play`

## Consequences

- 메인 피드/덱 상세는 SSR — 외부 유입 채널(검색·SNS) 활성화
- 게임 페이지 SSR HTML에도 단어 리스트 미포함 — 단어는 게임 시작 시 별도 API로 fetch ([0008](./0008-no-guess-autocomplete.md) 정합)
- 자동 가림된 덱은 sitemap·검색 결과에서 제외 ([0013](./0013-report-based-moderation-with-auto-hide.md))
- OG 이미지 동적 생성 → 캐싱 전략 필요 (좋아요 수 변동에 따른 갱신 빈도)
- 슬러그는 SEO friendly이지만 canonical로 redirect — duplicate content 방지
- 결과 공유 텍스트(이모지 그리드)는 OG 미리보기와 보완 관계 — 둘 다 유지
