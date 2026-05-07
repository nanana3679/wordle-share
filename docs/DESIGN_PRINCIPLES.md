# 설계 원칙

신규 기획(Shared Word Deck)의 9개 파생 디자인 원칙. 새 결정에 부딪히면 이 원칙으로 압축한다.

## 1. 단순성 > 기능 풍부함

- MVP 게임 모드 2개 (데일리 + 챌린지) — 자유 플레이는 V2
- 모더레이션은 신고 + 자동 가림. AI 스캔 / 금칙어 사전 V2
- Tag도 V2로 deferred — 안 쓰는 데이터 저장 X (ADR 0016)

## 2. 인위적 희소성 보존

- NYT 워들의 사회적 의식 메커니즘 답습
- 데일리 = 하루 1단어, 모두 같은 단어
- 챌린지도 1일 1회 — ritual scaffolding

## 3. 익명 기반, 마찰 최소

- 회원가입 없음. Supabase Anonymous Auth로 세션 자동 발급
- nick+pw는 첫 쓰기 액션 때만 명시 입력. 이후 localStorage 자동 채움
- 좋아요는 IP 단독 식별 — nick+pw 입력 마찰 없음

## 4. 덱 = 미니 커뮤니티 단위

- 자체 댓글 스레드 (deck × date)
- 자체 데일리 사이클
- 자체 챌린지 leaderboard 없음 — 본인 통계만

## 5. 봇 덱과 사람 덱의 UX 동일

- 운영자 시드 도구는 일반 사용자 API 호출 (도그푸딩)
- 식별 표시 없음 — 일반 nick(`bot_*`) 그대로 표시
- 큐레이션 슬롯 없음 — 품질이면 자연 상위

## 6. 보안 = enumeration 차단

- 자원 단위 인증만 (nick+pw가 자원 잠금)
- 신원 검색 기능 없음 — "이 사람의 덱 모두 보여줘" 불가
- 약한 비번 사용자 보호

## 7. 검증 못 할 것은 안 함

- 덱 사전 검수 X — UGC 자유
- 자동 모더레이션 V2 — Perspective/Claude 검증 비용
- 단어 minimum threshold X — organic filtering 신뢰

## 8. 제한 = ritual scaffolding, 신뢰 = 커뮤니티

- 사용자 점수 랭킹 없음 — cheating 우회 인센티브 제거 (ADR 0003)
- 1일 1회 챌린지는 보안 경계 아닌 게임 디자인 의식
- 점수 검증은 댓글 스레드의 사회적 검증 채널

## 8b. 콘텐츠 랭킹은 별개 위협 모델

- 좋아요 = 집단 시그널 (cheating-resistant)
- 점수 = 개인 행위 (cheating에 무가치화)
- 둘은 분리해서 결정 — 좋아요 랭킹 도입, 점수 랭킹 거부 (ADR 0004)
- 8의 보충 — "사용자 점수 랭킹 없음"이 모든 랭킹 거부를 뜻하지 않음

## 9. 서버 SSoT, 클라이언트 낙관적 UI

- 모든 액션에 `expected_version` 동봉 → 서버 검증 (ADR 0009)
- 좋아요 / 추측은 클라이언트 즉시 반영 + 서버 confirm async
- 멀티 탭 / race는 액션 시점 검증으로 (WebSocket sync는 V2)

## 적용 가이드

새 기능/결정이 생기면 위 9개 원칙 + 16개 ADR을 먼저 검토:

- 단순성 vs 풍부함 → 단순성 승
- 익명 vs 신원 → 익명 승 (단 자원 인증은 별개)
- 보안 표면 추가 → enumeration 차단 룰 위반인지 체크
- ritual 약화하는 기능 → 의도된 결정인지 ADR로 박제

상위 ADR 인덱스: [docs/adr/README.md](./adr/README.md)
용어집: [CONTEXT.md](../CONTEXT.md)
