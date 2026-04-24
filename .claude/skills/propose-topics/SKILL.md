---
name: propose-topics
description: Wordle-share AI 덱 파이프라인의 주제 후보를 생성한다. **견고한 팬덤 + 10~20대 디지털 네이티브 핵심층**을 가진 IP·프랜차이즈·canonical 세트 중심으로 선정 (바이럴/트렌드 추종 X, 중장년층 위주 IP X). 사용자가 "/propose-topics" 또는 "주제 후보 생성/뽑아줘"를 요청할 때 사용.
---

# propose-topics

`scripts/ai/artifacts/topics/topics-<runId>.json`과 `...trace.json`을 생성한다. 산출물 포맷·검수 플로우는 동일. 설계 배경은 `docs/feature/ai-deck-generation-pipeline.md` 참고.

## 핵심 방향

**두 조건 모두 충족해야 함**:

1. **장기 안정성**: "이번 주 핫"이 아니라 "오랫동안 팬덤이 굳건"한 IP. 신규 트렌드는 한 달 뒤 죽을 수 있지만, 견고한 IP는 1년 후에도 같은 팬이 같은 캐릭터를 검색.
2. **타겟 세대 적합**: 워들 공유 서비스의 실제 사용자층은 **10대~20대(30대 초반까지) 디지털 네이티브**. 중장년층 위주의 IP는 회피. 클래식이라도 *현재* 그 세대에서 활발해야 OK (예: 해리포터 OK, 셰익스피어/디스크월드/셜록홈즈 NO; 페르시잭슨 OK, 단테 NO).

타겟 세대 적합성 판단 기준 (다음 중 다수 충족):
- TikTok #fyp / 인스타 릴스 / 유튜브 쇼츠에서 활발
- BookTok·StanTok 등 젊은층 SNS 서브컬처에서 거론
- Discord 서버 활성 (수천~수만 멤버)
- 팬픽션 사이트(AO3, Wattpad) 작품 수 다수
- 활성 트위터/X 팬덤 (한국·일본·영미 어디서든)
- 굿즈·키링·인생네컷·팝업스토어 등 젊은층 소비 형태로 노출
- 실제로 10~20대가 "내 최애"로 언급

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

각 카테고리는 모두 **10~20대 핵심 팬덤**이 활발한 IP 중심으로 좁힘.

| category | 주 소스 | 포커스 (10~20대 팬덤 활발한 canonical 세트) |
|---|---|---|
| kpop | 나무위키, 공식 팬카페·위버스, dbkpop | 4세대~5세대 그룹 멤버 라인업 (뉴진스, 르세라핌, 아이브, 에스파, 스키즈, 투어스, 키스오브라이프, 베이비몬스터), 보이그룹·걸그룹 사옥별 (HYBE/SM/JYP/YG), 현역 솔로 (아이유, 태연 등) — **2010년 이전 데뷔한 1·2세대 단독 회피** |
| vtuber | hololive.tv, nijisanji.jp, virtualyoutuber.fandom.com, 나무위키 | 홀로라이브 JP/EN/ID 멤버, 니지산지 EN/JP, VShojo, Phase Connect, 이세계아이돌·스텔라이브 등 한국 V, 인디 V (Filian, Shylily 등) |
| anime-manga | MyAnimeList, 공식 위키, 나무위키 | **현재 연재 중이거나 최근 5년 내 화제작** 우선 — 주술회전, 체인소맨, 진격거 (완결), 원피스, 마법소녀 마도카, 약속의네버랜드, 헬싱, 도쿄 리벤져스, 스파이 패밀리, 봇치더락, 페르소나, 데드맨원더랜드. 클래식(드래곤볼·세인트세이야·캡틴츠바사 등 80~90년대) 회피 |
| videogames | 공식 게임 사이트, Fandom, 나무위키, ProSettings | 라이브 서비스 게임 캐릭터 (LoL 챔피언, 발로란트 요원, 오버워치 영웅, 에이펙스 레전드, 원신 캐릭터, 스타레일, 젠레스존제로), 인디·스팀 트렌드 (할로나잇, 셀레스트, 헤이즈), 포켓몬 (계속 신작), 마크·로블록스. **클래식 콘솔 only IP는 보조** |
| film-tv | IMDb, 공식 IP 위키 (marvel.fandom, hbo.com, netflix.com), 나무위키 | MCU·DCU 페이즈, 해리포터·신비한 동물사전, 스타워즈 (특히 만달로리안·아카솔라), 헝거게임·다이버전트, 오징어게임·기생충, K-드라마 (눈물의여왕·무빙·파묘), Netflix YA (브리저튼·웬즈데이·하트스토퍼), 디즈니+/HBO 시리즈. **클래식 시트콤·8090 영화 회피** |
| sports | 공식 리그·구단 페이지, transfermarkt, NBA.com, formula1.com | 글로벌 인기 리그 위주 (EPL 20팀·UCL, NBA 30팀, F1 10팀+드라이버, 그랜드슬램 테니스 선수, UFC). 한국 종목은 KBO보다 K리그·E스포츠 우선. **마이너 리그·국내 야구 단독 회피** |
| character-brands | sanrio.co.jp, line-friends.com, disney.fandom.com, ghibli.jp, 카카오 IP | 산리오 캐릭터(시나모롤·쿠로미·마이멜로디 등), 라인프렌즈, 카카오프렌즈, 망그러진곰·잔망루피·티니핑, 디즈니 프린세스, 픽사·지브리 인물, 캐릭터 IP는 인생네컷·키링 시장에 노출된 것 우선 |
| literature | Wikipedia, goodreads, BookTok 큐레이션, 나무위키 | **YA·MG·현대 판타지** 위주 — 해리포터, 퍼시잭슨/리오던버스, 헝거게임, 미스트본·스톰라이트(샌더슨), ACOTAR·Throne of Glass(SJ Maas), Fourth Wing(Empyrean), Six of Crows·Grishaverse, Shadowhunters, Wings of Fire, Warrior Cats. **셜록·디스크월드·셰익스피어·아가사 크리스티·고전 문학 회피** |
| tabletop-rpg | wizards.com, 5e.tools, dndbeyond, 유희왕 위키, MTG 위키 | D&D 5e 종족·클래스·몬스터 (Critical Role·Stranger Things 효과로 Z세대 부활), MTG 색·플레인즈워커, 유희왕 (시즌 4세대~), 포켓몬 TCG. **워해머·올드스쿨 보드게임 회피** |
| mythology-history | theoi.com, Wikipedia, 나무위키 | **퍼시잭슨 효과로 살아있는 신화 위주** — 그리스·로마·북유럽·이집트 신화의 신·괴물·영웅, 별자리, 행성, 원소. **역대 대통령·로마 황제·중국 왕조 등 정사 역사는 회피** (10~20대 관심 낮음) |

카테고리 안에서 어느 IP를 골라도 되지만 **canonical set 명확 + 10~20대 핵심 팬덤 활발**한 것 우선. 의심스러우면 해당 IP의 r/[name] 서브레딧 가입자 평균 연령, BookTok/StanTok 출현 빈도, 한국 위버스/디시 갤러리 활성도를 검색해 확인.

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
- **10~20대 핵심 팬덤 필수** (다음 중 다수 충족):
  - TikTok #fyp / 인스타 릴스 / 유튜브 쇼츠에서 활발
  - BookTok·StanTok 등 젊은층 SNS 서브컬처 출현
  - Discord 서버 활성 + 팬픽션 사이트(AO3, Wattpad) 작품 다수
  - 굿즈·키링·인생네컷·팝업스토어 등 젊은층 소비 형태
  - 한국 위버스/디시 갤러리/더쿠/엑스트위터 활성도
  - **중장년 위주 IP 명시 회피**: 80~90년대 시트콤, 1·2세대 K-pop 단독, 클래식 추리·고전 문학, 정사 역사(왕조·황제·대통령), 마이너 스포츠
- **canonical set 명확**: 멤버 명단·캐릭터 리스트·로스터가 공식 소스에 존재.
- 정치적 양극화·비극적·민감 주제 회피.
- 단발성 트렌드/밈 회피.
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
      "rationale": "왜 견고한 팬덤 IP이며 10~20대 핵심층이 활발한지 + 출처 인용",
      "fandomSignals": ["위키 규모", "TikTok/BookTok 출현", "Discord/팬카페 멤버 수", "젊은층 굿즈·인생네컷 노출 등"],
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
