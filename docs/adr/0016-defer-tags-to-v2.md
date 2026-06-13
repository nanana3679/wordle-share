# 0016. Tag 기능을 V2까지 deferred

## Status

Accepted

## Context

기획서(NOTES.md)는 word에 tag 기능을 정의:

- Word 모델: `{text, tags?: string[]}`
- 입력 신택스: `#tag` 인라인 + `#tag {...}` 블록
- "태그는 메타로만, 플레이 필터는 V2"

MVP에서 tag는 어떤 UI에도 노출되지 않고 V2 필터링이 도입돼야 의미가 생긴다. 그럼에도 저장할지(forward-compat) vs 완전 제거할지(YAGNI) 결정이 필요했다.

후보:
- (a) **저장만, UI 노출 X** — 봇 시드 스크립트의 구조화 입력 보존, V2 즉시 활용
- (b) **MVP에서 tag 자체를 제외** — 데이터 모델·입력 폼·시드 스크립트 모두 V2 이전 범위에서 제거 (본 결정)

## Decision

MVP 범위에서 tag 기능 전체를 제거. V2에서 필터링 UI와 함께 도입.

- `Word` 모델: `{text}`만. `tags` 필드 없음
- 덱 생성/편집 폼: `#tag` 신택스 파싱 X. 일반 텍스트(`,` 또는 개행 구분)
- 운영자 시드 스크립트(Phase 6): tag 출력 안 함. word 텍스트만 생성
- 검색·피드: tag 기반 필터 없음

## Consequences

### Pros
- YAGNI — 안 쓰는 데이터 저장·관리 비용 0
- 폼·파서 단순화 — `#tag` 신택스 검증·에러 메시지 불필요
- 데이터 모델 단순화 — Word 컬럼 1개(`text`) + 메타
- V2 도입 시점에 design 다시 검토 가능 — 현재 결정에 묶이지 않음

### Cons
- V2 도입 시 기존 word들 backfill 필요 — 제작자 수동 재편집 또는 LLM batch 분류
- 운영자 시드 스크립트 출력에 카테고리 정보 누락 — V2 도입 시 LLM이 다시 생성 가능

### Migration
- Phase 2 DB 마이그레이션: `Word` 테이블에 `tags` 컬럼 X
- V2: `tags TEXT[] DEFAULT '{}'` + GIN 인덱스 + UI/필터 + backfill 스크립트
