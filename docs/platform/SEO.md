# SEO

공개 메인 피드/검색 도입으로 외부 유입(검색 엔진/SNS)이 디스커버리의 큰 부분.

## 렌더링 전략

- **공개 페이지는 SSR/사전렌더링**: 메인 피드, 덱 상세, 검색 결과, sitemap, og 이미지
- **게임 페이지(`/d/[id]/play`)는 SPA + `noindex`** — 인터랙션 중심, SEO 우선순위 낮음, 정답 누설 방지
- 봇/크롤러는 SSR된 HTML로 메타데이터/콘텐츠 인덱싱

관련 ADR: [0012](../adr/0012-ssr-public-deck-pages.md)

## URL 구조

```
/                           메인 피드 (Hot 기본)
/?sort=likes                좋아요순 탭
/?sort=new                  최신순 탭
/search?q=원피스             검색 결과
/d/{deck_id}                덱 상세 (canonical)
/d/{deck_id}/{slug}         슬러그 추가 형태 → 301 to canonical
/d/{deck_id}/play           게임 페이지 (noindex)
/d/new                      덱 생성
/d/{deck_id}/edit           덱 편집
```

- `deck_id`는 nanoid (10자 추천)
- 슬러그는 덱 이름 기반 (예: `원피스-덱`). canonical로 301
- 덱 ID는 변하지 않으므로 슬러그 변경되어도 canonical 안정

## 메타데이터

각 덱 상세 페이지 자동 생성:

- `<title>`: `{덱이름} | shared-word-deck`
- `<meta name="description">`: 단어 수 / 스크립트 / 제작자 nick 요약 (정답 누설 X)
- **Open Graph**:
  - `og:title`: 덱 이름
  - `og:description`: 동일 요약
  - `og:image`: 동적 이미지 라우트 `/og/{deck_id}.png` (덱 이름 + 단어 수 + 좋아요 수 텍스트, 단어 내용 X)
  - `og:url`: canonical
  - `og:type`: website
- **Twitter Card**: `summary_large_image`
- **Schema.org**: `Game` 또는 `CreativeWork` JSON-LD

메인 피드/검색 결과도 동일 패턴, 페이지 단위 메타.

## 사이트맵 / robots

- `/sitemap.xml`: 자동 생성. `Deck.hidden = false` 모든 덱 포함. 일별 갱신 (next sitemap)
- `/robots.txt`:
  ```
  Allow: /
  Disallow: /d/*/play
  Sitemap: https://app/sitemap.xml
  ```
- 자동 가림된 덱은 sitemap + 검색 결과에서 제외

## 정답 누설 방지

- 검색 결과/메타에 단어 내용 절대 노출 X
- OG 이미지에도 단어 내용 X (이름/메타만)
- 덱 상세 페이지 SSR HTML에도 단어 리스트 X — 단어는 게임 시작 시점에 별도 API로 fetch
- 외부 노출 정보 = "이 IP의 덱입니다, 풀어보세요" 수준만

## 외부 공유 미리보기

- 카톡/디스코드/슬랙에 덱 링크 붙여넣기 → OG 이미지 + 제목 + 설명 자동 미리보기
- 결과 공유 텍스트 (이모지 그리드)는 별개 보완 — 사용자가 명시 paste

## OG 이미지 캐싱

- `/og/{deck_id}.png` 동적 생성 — Vercel/Edge function
- 좋아요 수 변동에 따른 갱신 — 캐시 TTL 1시간 + revalidate on like (V2)
- MVP는 단순 캐싱 (1h TTL)
