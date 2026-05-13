---
name: pr-scope-checker
description: PR 생성 전 scope 검증. git diff 분석 → domain layer 분류 → Verdict 출력. PR 작성 시 반드시 호출.
---

한 PR = 한 질문.
한 PR = 한 primary layer.
나머지 변경 = 보조만.

크면 쪼갠다.
독립 decision이면 쪼갠다.
리뷰 중 scope 늘면 멈춘다.

---

## 입력

사용자에게 다음을 요청한다:

```
1. PR type (decision / implementation / mechanical / docs / mixed)
2. 포함 scope (한 문장 이상)
3. 제외 scope
4. Main Review Question (한 문장)
```

입력 없으면 `git diff $(git merge-base HEAD origin/main)..HEAD --name-only` 결과로 추론한다.

---

## 분석 절차

### 1. 변경 파일 수집

```bash
git diff $(git merge-base HEAD origin/main)..HEAD --name-only
```

### 2. Domain Layer 매핑

변경 파일을 아래 layer로 분류:

```
docs           docs/, README, *.md (ADR 제외)
adr            docs/adr/
planning       docs/issue/, docs/planning/
product-spec   docs/product/, docs/domain/
architecture   docs/architecture/
infra          .github/, CI, config, wrangler*, next.config*, tsconfig*
game-state     app/**/play/, lib/game*, lib/round*
identity       lib/identity*, lib/auth*, middleware*
moderation     lib/moderation*, lib/report*
discovery      lib/feed*, lib/search*, lib/hot*
test           **/*.test.*, **/*.spec.*, **/fixtures/**, **/__snapshots__/
mechanical     파일명 변경, import path 수정, generated file
```

분류 안 되면 파일 경로 보고 가장 가까운 layer 선택.

### 3. Primary / Secondary 판별

- 가장 많이 변경된 layer = primary 후보
- 테스트, docs, fixture, lockfile = 항상 secondary
- secondary가 독립적인 리뷰 질문 생성 시 → secondary 아님, 별도 PR 후보

### 4. ADR count

`docs/adr/` 신규/수정 파일 수 카운트.

### 5. Decision Interlock 검증

변경이 2개 이상의 독립 decision을 포함하는지 확인:

```
A 없이 B merge 가능?
B 없이 A merge 가능?
A만 revert해도 B 의미 유지?
리뷰어가 A/B에 다른 결론 가능?
```

"예" 많음 = independent → split 신호.

---

## Verdict

### APPROVE

조건 대부분 충족:

```
primary layer 1개
secondary = test/docs/fixture/lockfile/generated
ADR 0–3
파일 ≤ 15
리뷰 질문 1문장
scope 선언과 diff 일치
decision interlocked
```

→ 진행.

---

### SUGGEST_SPLIT

조건 하나 이상 해당:

```
primary layer 2+
ADR 4+
파일 16–30
리뷰 질문 2+
independent decision 혼재
mixed인데 justification 약함
```

→ 분할안 제시. 사용자 확인 후 진행.

분할안 형식:

```
PR A: <title> — <primary layer>, <파일 수>개, ADR <n>개
PR B: <title> — <primary layer>, <파일 수>개, ADR <n>개
```

---

### REQUIRE_CHANGES

조건 하나 이상 해당:

```
primary layer 3+ and justification 없음
ADR 8+
파일 31+ and mechanical 아님
product + architecture + implementation 섞임
선언 scope != actual diff (크게 다름)
out-of-scope feedback을 issue 없이 본 PR에 반영
triage 없이 변경 누적
```

→ 중단. 수정 요청.

---

## 출력 형식

```
verdict: APPROVE | SUGGEST_SPLIT | REQUIRE_CHANGES
primary layer: <layer>
secondary layers: <layer>, <layer>
ADR count: <n>
file count: <n>
decision interlock: interlocked | independent (<이유>)
split suggestion: (SUGGEST_SPLIT일 때만)
  - PR A: ...
  - PR B: ...
reason: (SUGGEST_SPLIT / REQUIRE_CHANGES일 때 한 줄)
```

---

## PR Type별 추가 기준

### mechanical

```
behavior change 있으면 → REQUIRE_CHANGES
decision 변경 있으면 → REQUIRE_CHANGES
semantic change 섞이면 → SUGGEST_SPLIT
파일 수 제한 없음
```

### mixed

```
justification 없으면 → REQUIRE_CHANGES
"편해서"가 이유면 → REQUIRE_CHANGES
리뷰 질문 1개로 묶이면 → APPROVE 가능
```

---

## Review Triage 재호출

리뷰 응답 후 변경 추가 시 반드시 재호출.
새 변경을 A/B/C로 분류 후 scope-check 재실행:

```
A. in-scope must-fix → 본 PR 반영
B. in-scope optional → 본 PR or issue
C. out-of-scope → issue 생성, 본 PR 미반영
default: C
```
