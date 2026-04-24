---
name: propose-topics
description: Wordle-share AI 덱 파이프라인의 주제 후보를 생성한다. **견고한 팬덤이 있는 IP·프랜차이즈·canonical 세트** 중심으로 선정 (바이럴/트렌드 추종 X). 사용자가 "/propose-topics" 또는 "주제 후보 생성/뽑아줘"를 요청할 때 사용.
---

# propose-topics

`scripts/ai/artifacts/topics/topics-<runId>.json`과 `...trace.json`을 생성한다. 산출물 포맷·검수 플로우는 동일. 설계 배경은 `docs/feature/ai-deck-generation-pipeline.md` 참고.

## 핵심 방향

**"이번 주에 핫한 것"이 아니라 "오랫동안 팬덤이 굳건한 것"**. 신규 트렌드는 한 달 뒤 죽을 수 있지만, 견고한 IP는 1년 후에도 같은 팬이 같은 캐릭터를 검색한다. 덱의 장기 가치를 위해 후자만 뽑음.

## 인자 (자연어 또는 옵션)

- `category`: `kpop` `vtuber` `anime-manga` `videogames` `film-tv` `sports` `character-brands` `literature` `tabletop-rpg` `mythology-history` 중 하나. 미지정 시 runId 해시로 자동 선정.
- `count`: 3~15 (기본 10).

## 실행 절차

1. `runId = YYYYMMDD-HHMMSS` (UTC, zero-padded).
2. 카테고리 미지정 시: runId 각 문자 코드에 대해 `acc = (acc * 31 + code) >>> 0` 누적 → 위 10개 중 `acc % 10`.
3. `scripts/ai/artifacts/topics/` 내 `topics-*.json` 중 `generatedAt`이 최근 28일 이내인 것들에서 `status !== "rejected"` 후보의 `topic` 수집 → **avoid 리스트**.
4. 카테고리 브리프(아래 표)에 맞춰 WebSearch / WebFetch로 후보 탐색. 후보당 2~4개 URL 인용, **공식 사이트·위키·나무위키 우선** (블로그·뉴스 사이트는 보조).
5. 주제 제약(아래 "주제 제약") 적용.
6. 산출물 디렉토리 보장: `mkdir -p scripts/ai/artifacts/topics`.
7. `topics-<runId>.json` Write (`wx`로 덮어쓰기 금지). 스키마는 `scripts/ai/schemas.ts`의 `TopicsArtifactSchema`.
8. `topics-<runId>.trace.json` Write: 검색 쿼리·fetch URL(200자 프리뷰)·선정 근거 요약.
9. `pnpm tsx -e "..."`로 zod 검증 (아래 "검증" 참고). 실패 시 JSON 수정 후 재검증.

## 카테고리 브리프

| category | 주 소스 | 포커스 (canonical 세트 예) |
|---|---|---|
| kpop | 나무위키, Wikipedia, 공식 팬카페·위버스 | 그룹별 멤버 라인업 (BTS, 뉴진스, 르세라핌, 스키즈), 사옥별 그룹 (HYBE/SM/JYP/YG 소속), 솔로 디스코그래피 |
| vtuber | hololive.tv, nijisanji.jp, virtualyoutuber.fandom.com, 나무위키 | 에이전시 지부 멤버 (홀로 JP/EN/ID, 니지 EN/JP/KR), 세대별 (gen0~holox, wave 1~9), VShojo·Phase Connect 라인업 |
| anime-manga | MyAnimeList, Wikipedia, 나무위키, 공식 위키 (one piece wiki, naruto fandom) | 캐릭터 로스터 (스트로햇 해적단, 호카게, 진격 조사병단), 핵심 set (악마의 열매, 차크라 자질, 스탠드, 페어리테일 길드) |
| videogames | 공식 게임 사이트, IGN wiki, Fandom wiki, 나무위키 | 캐릭터 로스터 (LoL 챔피언, 오버워치 영웅, 발로란트 요원, 슴브 파이터, 마리오 캐릭터, 젤다 보스), 포켓몬 세대별, 마인크래프트 몹·바이옴 |
| film-tv | IMDb, Wikipedia, 나무위키, 공식 IP 위키 (marvel.fandom, harrypotter.fandom) | 마블 어벤져스, X멘, DC 저스티스리그, 호그와트 교수·기숙사, GoT 가문, 심슨·패밀리가이 인물, 스타워즈 캐릭터, 한국 사극·오징어게임 인물 |
| sports | 공식 리그·구단 페이지, ESPN, transfermarkt, NBA.com | 리그 클럽 라인업 (EPL 20팀, NBA 30팀, MLB 30팀), F1 컨스트럭터·드라이버 라인업, 올타임 레전드 라인업, 올림픽 종목 |
| character-brands | sanrio.co.jp, line-friends.com, disney.fandom.com, ghibli.jp | 산리오 캐릭터, 라인프렌즈, 카카오프렌즈, 디즈니 프린세스, 픽사 영화 인물, 스튜디오 지브리 작품 인물, Hello Kitty 친구들 |
| literature | Wikipedia, sparknotes, 나무위키, goodreads | 반지의 제왕 종족·인물, 해리포터 마법동물·주문, 셰익스피어 작품, 추리소설 인물 (셜록·아가사 크리스티), 한국 고전·현대문학 인물 |
| tabletop-rpg | wizards.com, 5e.tools, dndbeyond, 유희왕 위키, 매직더개더링 위키 | D&D 종족·클래스·몬스터, MTG 색깔·플레인즈워커, 유희왕 시리즈 카드·인물, Warhammer 챕터, 보드게임 IP |
| mythology-history | Wikipedia, theoi.com, 나무위키, britannica | 그리스·로마·북유럽·이집트 신화 신·괴물, US 대통령·로마 황제·중국 왕조, 별자리, 행성, 화학원소 |

카테고리 안에서 어느 IP를 골라도 되지만 **canonical set이 명확하고 팬덤이 활발한 것** 우선.

## 주제 제약

- **덱 크기 무제한**: 작은 세트(7명) / 큰 세트(포켓몬 전체) 모두 OK.
- **단어 길이 무제한**: 2글자(`rm`, `iu`)부터 긴 이름까지 OK.
- **a-z 로마자만 가능**: 영어 또는 로마자 고유명사. 로컬라이즈 IP(포켓몬 등)는 **글로벌 공식 로마자** (피카츄→`pikachu`).
- **졸업/은퇴/사망 멤버 포함**: BTS는 영원히 7명, 홀로라이브는 졸업 멤버 포함, 마블은 사망 캐릭터 포함.
- **태그 taxonomy 자연스러운 IP 선호** (세대/타입/지부/소속/세계관) — 서브카테고리가 없으면 가치↓.
- **견고한 팬덤 신호 필수** (다음 중 다수 충족):
  - 위키·팬덤 사이트(Fandom, 나무위키, 전용 wiki) 보유 + 정기 업데이트
  - 활성 서브레딧·디스코드·팬카페 (수만~수십만 규모)
  - 다년간 활동·시리즈 지속 (1년 미만 신생 IP는 회피, 단 명확한 lore가 잡힌 경우 예외)
  - 공식 머천다이징·정기 이벤트·컨벤션
  - 팬덤 자체 용어·은어가 정착됨
- **canonical set 명확**: 멤버 명단·캐릭터 리스트·로스터가 공식 소스에 존재해야 함.
- 정치적 양극화·비극적·민감 주제 회피.
- 단발성 트렌드/밈 회피 (1년 후에도 같은 팬이 검색할 IP만).
- avoid 리스트와 중복·근접 패러프레이즈 금지.

## 산출 JSON 형태

```json
{
  "runId": "20260424-120000",
  "generatedAt": "2026-04-24T12:00:00.000Z",
  "category": "vtuber",
  "model": "claude-code-skill",
  "candidates": [
    {
      "id": "20260424-120000-c1",
      "topic": "...",
      "description": "1-2 문장",
      "rationale": "왜 견고한 팬덤 IP인지 + 출처 인용",
      "fandomSignals": ["위키 규모", "활성 서브레딧 수", "정기 이벤트", "다년 활동 등"],
      "sources": [{ "url": "https://...", "title": "...", "publishedAt": "2026-04-18" }],
      "status": "pending"
    }
  ]
}
```

- `id`: `<runId>-c<index>` (1-indexed).
- `model`: `"claude-code-skill"` 고정.
- `sources[].url`은 http/https만.
- `fandomSignals`: 견고한 팬덤의 구체적 증거 2~4개 (구독자 수, 위키 페이지 수, 컨벤션 규모, 시리즈 지속 햇수 등).

## trace JSON 형태

```json
{
  "runId": "...",
  "generatedAt": "...",
  "webSearches": [{ "query": "...", "resultCount": 0, "topUrls": ["..."] }],
  "webFetches": [{ "url": "...", "retrievedAt": "...", "preview": "처음 200자" }],
  "notes": "선정 근거 요약·판단 기록"
}
```

## 검증

```bash
pnpm tsx -e "const { TopicsArtifactSchema } = require('./scripts/ai/schemas'); const fs = require('fs'); const path = process.argv[1]; TopicsArtifactSchema.parse(JSON.parse(fs.readFileSync(path, 'utf8'))); console.log('ok');" scripts/ai/artifacts/topics/topics-<runId>.json
```

검증 실패 시 JSON을 수정해 재검증. 수정해도 통과 못 하면 사용자에게 보고.

## 완료 메시지

```
[propose-topics] wrote N candidates to scripts/ai/artifacts/topics/topics-<runId>.json
Next: review the file, set "status": "approved"/"rejected", then run /generate-decks <path>.
```
