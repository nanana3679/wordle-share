---
name: propose-topics
description: Wordle-share AI 덱 파이프라인의 주제 후보를 생성한다. **장기 안정성 + 10~20대 디지털 네이티브 + Roster-first(50+ 캐릭터·정기 확장·다중 tag axes)** 3조건 충족 IP만 선정. 이상형은 LoL·포켓몬·홀로라이브. 바이럴/트렌드 추종 X, 중장년 IP X, Story-first 좁은 캐스트 IP X. 사용자가 "/propose-topics" 또는 "주제 후보 생성/뽑아줘"를 요청할 때 사용.
---

# propose-topics

`scripts/ai/artifacts/topics/topics-<runId>.json`과 `...trace.json`을 생성한다. 산출물 포맷·검수 플로우는 동일. 설계 배경은 `docs/feature/ai-deck-generation-pipeline.md` 참고.

## 핵심 방향

**세 조건 모두 충족해야 함**:

1. **장기 안정성**: "이번 주 핫"이 아니라 "오랫동안 팬덤이 굳건"한 IP. 신규 트렌드는 한 달 뒤 죽을 수 있지만, 견고한 IP는 1년 후에도 같은 팬이 같은 캐릭터를 검색.
2. **타겟 세대 적합**: 실제 사용자층은 **10대~20대(30대 초반까지) 디지털 네이티브**. 중장년층 위주 IP 회피.
3. **Roster-first IP**: 워들 덱의 확장성과 태그 분류를 위해 **대형 canonical 엔티티 세트**가 있어야 함. 이상형: LoL·포켓몬·홀로라이브처럼 50+ 멤버/캐릭터가 정기적으로 확장되며 팬이 "내 최애"를 개인화해서 말하는 IP. Story-first(주인공 10~30명 좁은 캐스트, 플롯 중심) 회피.

### 타겟 세대 적합성 신호 (다수 충족)
- TikTok #fyp / 인스타 릴스 / 유튜브 쇼츠 활발
- BookTok·StanTok 등 젊은층 SNS 서브컬처 출현
- Discord 서버 활성 (수천~수만)
- 팬픽션(AO3, Wattpad), 한국 위버스·디시·더쿠 갤러리 활성
- 굿즈·키링·인생네컷·팝업스토어 노출
- 실제로 10~20대가 "내 최애"로 언급

### Roster-first IP 신호 (다수 충족)
- **≥50 canonical 엔티티** (캐릭터·챔피언·멤버·종족·학생 등)
- 정기적 신규 추가 (패치·세대·웨이브 — 정체된 canon 회피)
- **2개 이상 독립 tag axes** — LoL(role × region), 포켓몬(gen × type), 홀로(branch × gen × sub-unit), 원신(element × weapon × region)
- 멤버별 개별 팬 활동 (개별 팬아트·굿즈·서브레딧/스레드·동인)
- 팬덤 어휘로 "내 main / 내 oshi / 내 최애" 개인화 존재
- **이상적 예**: LoL 챔피언, 포켓몬, 홀로라이브 탤런트, 원신 캐릭터, 산리오 캐릭터, 마블 어벤져스 전체 roster
- **회피 예**: 해리포터 주인공 7명, ACOTAR inner circle, 셜록홈즈, Fourth Wing 라이더. 단 *동 IP의 roster 성격 집합*(해리포터 마법동물 100+, 해리포터 주문 컬렉션)은 OK

## 인자 (자연어 또는 옵션)

- `category`: `kpop` `vtuber` `anime-manga` `videogames` `mobile-gacha` `film-tv` `sports` `character-brands` `tabletop-rpg` `mythology-history` 중 하나. 미지정 시 runId 해시로 자동 선정.
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

각 카테고리는 **Roster-first + 10~20대 핵심 팬덤** IP 중심. 각 셀의 예시는 50+ 엔티티 + 2+ tag axes를 자연스럽게 충족하는 것들.

| category | 주 소스 | 포커스 (Roster-first + 젊은층 IP) |
|---|---|---|
| kpop | 나무위키, 공식 팬카페·위버스, dbkpop | HYBE/SM/JYP/YG 사옥별 전체 아티스트 로스터, 4~5세대 그룹 (뉴진스·르세라핌·아이브·에스파·스키즈·투어스·키오프·베이비몬스터) 멤버·서브유닛, SM STATION 아티스트 연대별. **1·2세대 한 그룹 단독 회피** (캐스트 좁음) |
| vtuber | hololive.tv, nijisanji.jp, virtualyoutuber.fandom.com, 나무위키 | 홀로라이브 전체 탤런트 (JP gen0~gen6/holox + EN wave1~3 + ID gen1~3 + DEV_IS ReGLOSS 등 70+), 니지산지 전체 (JP/EN/KR), 이세계아이돌+스텔라이브, VShojo·Phase Connect 전체 |
| anime-manga | MyAnimeList, 공식 위키, 나무위키 | **대형 캐스트 작품** 우선 — 원피스(스트로햇+악마의 열매 100++샤봉디 이후 해적), 나루토(허단·인술·미수·마을), 주술회전(저주술사+저주·식신), 헌터x헌터(넨·헌터 분류), 페르소나(페르소나 소환수 100+), 바키(파이터 로스터), 원신은 mobile-gacha로. **좁은 캐스트·학원물 회피** |
| videogames | 공식 게임 사이트, Fandom, 나무위키 | **로스터 중심 게임만** — LoL 챔피언(170+), 발로란트 요원, 오버워치 영웅, 스마브 파이터, 포켓몬(1000+), 마인크래프트 몹·바이옴, 데드바이데이라이트 서바이버·킬러, 레인보우식스 오퍼레이터. **단편 스토리 RPG·액션 회피** (캐스트 좁음) |
| mobile-gacha | 공식 게임·HoYoLAB, prydwen.gg, Fandom | 가챠 RPG의 캐릭터 로스터 (정기 패치로 계속 확장) — 원신(80+ 캐릭터, element×weapon×region), 스타레일(path×element×faction), 젠레스존제로(faction×attribute), 블루아카이브(학생 100+, 학교×무기×클래스), 명조, 우마무스메, 프리코네, 승리의여신니케 |
| film-tv | IMDb, marvel.fandom, hbo.com, netflix.com, 나무위키 | **대형 roster 프랜차이즈** — MCU 전체(어벤져스+멀티버스+X멘+판타스틱4 50+), DCU, 스타워즈 전체(영화+만달로리안+아소카+클론전쟁), 해리포터 마법동물·주문 컬렉션, GoT 가문·주요 인물 모두. **단편 드라마·영화 단독 회피** (캐스트 좁음) |
| sports | 공식 리그·구단, transfermarkt, NBA.com, formula1.com, lolesports.com | EPL 20팀·UCL 진출 클럽, NBA 30팀, F1 10팀+드라이버, LoL 프로 (LCK·LPL·LEC·LCS 팀 라인업), 발로란트 VCT 프로팀, UFC 챔피언·체급. **개별 경기·단기 이벤트 회피** |
| character-brands | sanrio.co.jp, line-friends.com, disney.fandom.com, ghibli.jp | 산리오 캐릭터 전체(80+), 라인프렌즈·카카오프렌즈, 망그러진곰·티니핑 시리즈, 디즈니 프린세스 + 픽사·지브리 주요 IP 인물, 산리오 스타일 일본 캐릭터 (마이멜·쿠로미·시나모롤·핸갸쿠 등) |
| tabletop-rpg | wizards.com, 5e.tools, dndbeyond, 유희왕 위키, MTG 위키 | D&D 5e 전체 종족+클래스+몬스터 매뉴얼, MTG 플레인즈워커·전설적 크리처, 유희왕 시리즈 카드·몬스터, 포켓몬 TCG 카드. **보드게임 단일 IP는 보조** |
| mythology-history | theoi.com, Wikipedia, 나무위키 | 그리스 신(올림포스 12신+티탄+영웅+괴물 100+), 북유럽 신화(아스가르드+요툰헤임+Ragnarök 인물), 이집트 신, 성경 인물 집합, 별자리 88개, 원소 118개, 행성·위성. **정사 역사 인물 리스트(대통령·황제·왕조) 회피** |

카테고리 안에서 IP를 고를 땐 **≥50 canonical 엔티티 + 2+ tag axes가 자연스러움** + 10~20대 활성도를 확인. 의심스러우면 해당 IP 서브레딧 크기, 위키 캐릭터 페이지 수, 한국 디시·위버스·더쿠 갤러리 활성도 검색.

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
- **Roster-first IP 필수** (다음 모두 충족):
  - ≥50 canonical 엔티티 확보 가능
  - 2+ 독립 tag axes (예: element×weapon×region) 자연스러움
  - 정기 확장 (패치·세대·웨이브·신권 — 정체된 canon 회피)
  - **Story-first 회피**: 주인공 10~30명 좁은 캐스트·플롯 중심 IP 단독 금지. 동 IP의 roster 성격 subset(해리포터 마법동물·주문 컬렉션 등)은 OK
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
      "rationale": "왜 roster-first + 견고한 팬덤 + 10~20대 핵심층인지 + 출처 인용",
      "fandomSignals": ["canonical 엔티티 수 (예: LoL 챔피언 170+)", "2+ tag axes (role×region 등)", "TikTok/Discord/위버스 활성도", "멤버별 개별 팬 활동 증거"],
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
