---
name: docs-convention
description: /docs 하위 문서를 생성하거나 수정할 때, 또는 기능 완성 후 문서화할 때 사용. "문서 작성", "docs 업데이트", "문서화" 등의 요청에 트리거.
---

# 문서 컨벤션

/docs 하위 문서를 작성·수정할 때 아래 규칙을 따른다.

## 폴더 구조

```
docs/
├── README.md                    문서 인덱스 (폴더 트리 + 1줄 요약)
├── PROJECT_OVERVIEW.md          프로젝트 컨셉·MVP 정의
├── DESIGN_PRINCIPLES.md         설계 원칙
│
├── product/                     사용자 관점 기능·UX·게임 메커닉
├── architecture/                DB 스키마, API 계약, 기술 스택
├── domain/                      도메인 규칙 (좋아요/댓글/피드/모더레이션/신원)
├── platform/                    SEO, 성능, 접근성, 에러 처리, 테스트
├── operations/                  운영 도구, 시드 파이프라인
├── engineering/                 코딩 규칙, 컨트리뷰션 가이드, 패턴 예시
│
├── adr/                         Architecture Decision Record
│   └── NNNN-<kebab-title>.md    번호 4자리 + kebab. README.md에 인덱스
│
└── issue/                       이슈/사고 기록, 마이그레이션 계획
```

폴더 미분류 문서가 누적되면 새 카테고리 신설을 고려.

## 파일명

- 최상위·카테고리 폴더 내 기획/설계 문서: `SCREAMING_SNAKE_CASE.md`
- `adr/` 하위: `NNNN-<kebab-title>.md` (4자리 번호 + kebab)
- `issue/` 하위: `kebab-case.md`

## 구조

- `# 제목` → `## 섹션` → 불릿 포인트 중심
- 서술형 문장은 최소화하고, 핵심만 짧게
- 한국어 기본, 기술 용어는 영어 그대로 사용

## ADR 템플릿

각 ADR은 다음 섹션을 포함:

- `## Status` — Proposed / Accepted / Superseded by NNNN
- `## Context` — 결정이 필요해진 배경
- `## Decision` — 채택한 결정
- `## Consequences` — 트레이드오프, 영향 범위, 후속 작업

## 코드 예제

- 실제 구현 코드 삽입은 지양
- 구조/네이밍/시나리오를 보여주기 위한 간략한 예시는 허용
- 코드 분량이 커지면 별도 문서로 분리

## 길이

- 관행적으로 ~80줄 목표 (강제는 아님)
- 초과 시 주제별로 별도 파일로 분할 고려

## 문서 작성 시점

- 기능을 완성할 때마다 적합한 카테고리 폴더에 문서 작성
- 의사결정이 발생할 때마다 `adr/`에 ADR 추가
- 이슈/사고/마이그레이션 발생 시 `issue/`에 기록

## 작업 전 확인

- 대화 시작 시 `docs/README.md`로 전체 구조를 먼저 파악
- 요구사항과 관련된 기존 문서를 찾아보고 충돌 여부 확인 후 작성/수정
