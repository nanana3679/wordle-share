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

## 분석 절차

### 0. 입력 수집 (추론 우선)

다음 순서로 정보를 수집한다. 판정 불가할 때만 사용자에게 질문한다.

1. 현재 대화 맥락에서 PR type / scope / review question 추론
2. `.github/pull_request_template.md` 또는 사용자가 작성 중인 PR draft 확인
3. `git diff` 결과에서 변경 내용 추론
4. 위 세 가지로 판정 불가한 항목만 사용자에게 질문

### 1. 변경 파일 수집

base branch는 다음 우선순위로 결정한다:
1. 사용자 입력값 (명시된 경우)
2. `git symbolic-ref refs/remotes/origin/HEAD` 결과
3. `origin/main` fallback

```bash
BASE=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||' || echo "main")
git diff $(git merge-base HEAD origin/$BASE)..HEAD --name-only
```

### 2. Domain Layer 매핑

변경 파일을 아래 layer로 분류:

```
meta           .claude/, .github/ (workflows 제외), process 문서, agent 정의, skill 파일
docs           docs/ (adr 제외), README, *.md
adr            docs/adr/
planning       docs/issue/, docs/planning/
product-spec   docs/product/, docs/domain/
architecture   docs/architecture/
infra          .github/workflows/, CI config, wrangler*, next.config*, tsconfig*, package.json
game-state     app/**/play/, lib/game*, lib/round*
identity       lib/identity*, lib/auth*, middleware*
moderation     lib/moderation*, lib/report*
discovery      lib/feed*, lib/search*, lib/hot*
test           **/*.test.*, **/*.spec.*, **/fixtures/**, **/__snapshots__/
mechanical     파일명 변경, import path 수정, generated file
```

분류 안 되면 파일 경로 보고 가장 가까운 layer 선택.

### 3. Primary Layer 판별 (우선순위 순)

다음 순서로 primary layer를 결정한다. 파일 수는 최후 수단이다.

1. **PR type 선언** — 선언된 type으로 primary layer 추론
   - `decision` → adr 또는 planning
   - `implementation` → 기능 코드 layer
   - `mechanical` → mechanical
   - `docs` → docs
2. **Main Review Question 키워드** — 질문에서 layer 키워드 추출
3. **포함 scope 선언** — 선언된 포함 항목에서 layer 추론
4. **Semantic change layer** — test/docs/fixture 제외 후 가장 많이 변경된 layer
5. **파일 수 기준** — 위 4단계로 판정 불가할 때만

Secondary: test, docs, fixture, lockfile, generated file은 항상 secondary.
secondary가 독립 리뷰 질문 생성 시 → secondary 아님, 별도 PR 후보.

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
"아니오" 많음 = interlocked → 같은 PR 가능.

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

---

## Verdict 예시 케이스

### APPROVE 예시

```
PR type: implementation
변경: lib/identity.ts, lib/identity.test.ts, docs/architecture/IDENTITY_MODEL.md
primary layer: identity
secondary layers: test, docs
ADR count: 0
file count: 3
리뷰 질문: nick+pw bcrypt 검증 로직이 올바른가?

→ verdict: APPROVE
```

### SUGGEST_SPLIT 예시

```
PR type: mixed
변경: docs/adr/0001.md, docs/adr/0002.md, docs/adr/0003.md, docs/adr/0004.md,
      lib/identity.ts, lib/game-state.ts, app/play/page.tsx
primary layer: adr (4개), identity, game-state 혼재
ADR count: 4
file count: 7

→ verdict: SUGGEST_SPLIT
reason: ADR 4개 이상. identity/game-state는 독립 decision.
split suggestion:
  - PR A: identity 정책 결정 — adr, 파일 2개, ADR 2개
  - PR B: game-state 정책 결정 — adr, 파일 2개, ADR 2개
  - PR C: identity 구현 — identity layer, 파일 1개, ADR 0개
  - PR D: game-state 구현 — game-state layer, 파일 1개, ADR 0개
```

### REQUIRE_CHANGES 예시

```
PR type: mixed (justification 없음)
변경: docs/adr/ 9개, lib/identity.ts, lib/game-state.ts, lib/moderation.ts,
      app/play/, app/feed/, app/d/
primary layer: adr, identity, game-state, moderation, discovery 혼재
ADR count: 9
file count: 16

→ verdict: REQUIRE_CHANGES
reason: ADR 8+ (9개). primary layer 5개, justification 없음. product + architecture + implementation 동시 변경.
```
