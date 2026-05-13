CLAUDE.md 자체의 분량을 100줄 이하로 유지한다.
문서 작성/수정 시 docs-convention 스킬을 참고한다.

## PR 생성 룰

PR 생성 전 반드시 `pr-scope-checker` sub-agent 호출:

- APPROVE → 진행
- SUGGEST_SPLIT → 분할안 사용자 확인 후 진행
- REQUIRE_CHANGES → 중단, 수정 후 재호출

리뷰 응답 후 변경 추가 시 재호출.

### Review Triage

리뷰 피드백은 반드시 A/B/C 분류:

- A. in-scope must-fix → 본 PR 반영
- B. in-scope optional → 본 PR or issue
- C. out-of-scope → issue 생성, 본 PR 미반영
- default: C
