# pr-scope-checker 실행 로그 (Issue #59)

PR #58에서 추가한 `pr-scope-checker` sub-agent의 세 가지 Verdict 케이스별 실제 실행 로그.
`.claude/agents/pr-scope-checker.md` 기준 — 임계값과 출력 형식은 agent 정의를 그대로 따른다.

실행 일시: 2026-06-13  
실행 방식: `Agent(subagent_type: "pr-scope-checker")` — 실제 sub-agent 호출, synthetic diff 입력

---

## Case 1 — APPROVE

### 입력 시나리오

| 항목 | 값 |
|---|---|
| PR type | `implementation` |
| Branch | `feature/identity-validation` |
| Main Review Question | `lib/identity.ts`의 nick+pw bcrypt 검증 로직이 올바른가? |
| 변경 파일 | `lib/identity.ts`, `lib/identity.test.ts`, `docs/CODING_STANDARDS.md` |
| ADR 신규/수정 | 0개 |
| 파일 수 | 3개 |

### 실행 결과

```text
verdict: APPROVE
primary layer: identity
secondary layers: test, docs
ADR count: 0
file count: 3
decision interlock: interlocked (bcrypt cost factor 문서화는 identity 구현 결정과 동일 decision — 검증 로직 없이 cost factor 문서만 독립 의미 없음)

진행해도 된다.
```

### 판정 근거

- primary layer 1개 (identity), secondary는 test/docs (항상 secondary)
- ADR 0–3 범위, 파일 ≤ 15 모두 충족
- 리뷰 질문 1문장, decision interlocked

---

## Case 2 — SUGGEST_SPLIT

### 입력 시나리오

| 항목 | 값 |
|---|---|
| PR type | `mixed` (justification 없음) |
| Branch | `feature/identity-and-moderation` |
| Main Review Question | 없음 |
| 변경 파일 | `docs/adr/0017~0020` (ADR 4개) + `lib/identity.ts`, `lib/moderation.ts`, `lib/report.ts` |
| ADR 신규 | 4개 |
| 파일 수 | 7개 |

### 실행 결과

```text
verdict: SUGGEST_SPLIT
primary layer: adr (4개), identity, moderation 혼재
secondary layers: 없음
ADR count: 4
file count: 7
decision interlock: independent

  identity(0017, 0020 + lib/identity.ts)와 moderation(0018, 0019 + lib/moderation.ts + lib/report.ts)는
  서로 없이 독립적으로 merge/revert 가능하며, 리뷰어가 각각 다른 결론에 도달할 수 있음.

split suggestion:
  - PR A: identity 정책 및 구현 — identity layer, 파일 3개 (ADR 0017·0020 + lib/identity.ts), ADR 2개
  - PR B: moderation/report 정책 및 구현 — moderation layer, 파일 4개 (ADR 0018·0019 + lib/moderation.ts + lib/report.ts), ADR 2개

reason: ADR 4개 이상 (경계값 충족). identity와 moderation은 독립 decision — 각 ADR 쌍이 서로 다른 도메인을 다루며 각각 독립 merge/revert 가능.
```

### 판정 근거

- SUGGEST_SPLIT 조건: ADR 4+ (경계값)
- identity ↔ moderation 독립 decision 혼재
- 분할안 2개 제시, 사용자 확인 대기

---

## Case 3 — REQUIRE_CHANGES

### 입력 시나리오

| 항목 | 값 |
|---|---|
| PR type | `mixed` (justification 없음) |
| Branch | `feature/big-refactor` |
| Main Review Question | 없음 |
| 변경 파일 | ADR 9개 + lib/ 10개 + app/ 3개 + infra 3개 + docs 7개 = 33개 |
| ADR 신규 | 9개 |
| 파일 수 | 33개 |
| 도메인 | identity, moderation, game-state, discovery, infra 혼재 |

### 실행 결과

```text
verdict: REQUIRE_CHANGES
primary layer: adr, identity, moderation, game-state, discovery, infra 혼재 (6개)
secondary layers: docs, architecture
ADR count: 9
file count: 33
decision interlock: independent
  - identity (ADR 2개) vs moderation (ADR 2개): 독립
  - game-state (ADR 2개) vs discovery (ADR 3개): 독립
  - infra 변경은 귀속 도메인 불명확
reason: ADR 9개 (임계치 8+ 초과). primary layer 6개, justification 없음.
  product + architecture + implementation 동시 변경. 파일 33개 (임계치 31+ 초과, mechanical 아님).
  독립 decision 4개 도메인이 단일 PR에 혼재.
```

분할안 (5~6개 PR):

```text
PR A: identity 정책 결정 및 구현 — identity layer, 파일 5개, ADR 2개
PR B: moderation/report 정책 결정 및 구현 — moderation layer, 파일 4개, ADR 2개
PR C: game-state 정책 결정 및 구현 — game-state layer, 파일 5개, ADR 2개
PR D: discovery(feed/search) 정책 결정 및 구현 — discovery layer, 파일 8개, ADR 3개
PR E: infra 설정 변경 — infra layer, 파일 3개, ADR 0개
PR F: docs 일괄 업데이트 (선택) — docs layer, 파일 7개, ADR 0개
```

중단. `feature/big-refactor` 브랜치를 PR A–E(F 선택)로 분할한 뒤 각 PR에 대해 scope-check 재호출.

### 판정 근거

- REQUIRE_CHANGES 조건 복수 해당:
  - ADR 9개 (임계치 8+)
  - 파일 33개 (임계치 31+, mechanical 아님)
  - primary layer 6개, justification 없음
  - product + architecture + implementation 동시 변경

---

## 임계값 요약

| Verdict | 주요 트리거 |
|---|---|
| APPROVE | primary layer 1개, ADR 0–3, 파일 ≤ 15, 리뷰 질문 1개, decision interlocked |
| SUGGEST_SPLIT | ADR 4–7, 파일 16–30, primary layer 2+, independent decision 혼재 |
| REQUIRE_CHANGES | ADR 8+, 파일 31+ (non-mechanical), primary layer 3+ justification 없음, product+architecture+implementation 동시 변경 |
