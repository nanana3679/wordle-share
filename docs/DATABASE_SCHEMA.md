# 데이터베이스 스키마

## 인증 구조 (이중 신원)

### 세션 신원: `auth.users` (Supabase Anonymous Auth)

사이트 방문 시 자동으로 익명 사용자 레코드가 생성됩니다. `is_anonymous = true` 이며, 향후 Google/Discord OAuth 로 업그레이드 가능합니다.

- **용도**: 게임 기록, 좋아요 중복 방지, (향후) 개인 랭킹
- **생명 주기**: 쿠키 기반 세션. 계정 업그레이드 전까지 기기 단위로 존재
- **RLS**: `auth.uid()` 가 세션 신원으로 사용됨

### 덱 편집 신원: `decks.password_hash`

덱 자체에 비밀번호 해시를 저장하고, 수정/삭제 시 Server Action 에서 검증합니다.

- **용도**: 기기/세션과 무관하게 덱 편집 가능
- **저장**: bcrypt 해시 (평문 금지)
- **검증**: Server Action 에서 수동 검증 (RLS 로는 처리 불가)

## Decks 테이블

- `id`: UUID (PK)
- `name`: 덱 이름
- `description`: 덱 설명
- `words`: 단어 배열 (text[])
- `thumbnail_url`: 썸네일 이미지 URL
- `is_public`: 공개 여부
- `created_at` / `updated_at`: 타임스탬프
- `nickname`: 작성자 닉네임
- `password_hash`: 덱 편집 비밀번호 (bcrypt)
- `creator_session_id`: 최초 생성 시 `auth.uid()` (익명 세션 추적용, nullable)

## Likes 테이블

- `deck_id`: 덱 ID (FK → Decks.id)
- `user_id`: `auth.users.id` (익명 세션 포함)
- `created_at`: 타임스탬프

**Primary Key**: `(deck_id, user_id)` 복합키

## (향후) GameRecords 테이블

Phase 3 랭킹 도입 시 추가 예정:

- `id`, `deck_id`, `user_id` (auth.uid), `attempts`, `duration_ms`, `success`, `created_at`

## 관계

```
auth.users (1) ──── (N) Likes
                    (N) GameRecords (향후)

Decks (1) ──── (N) Likes
          ───── (N) GameRecords (향후)
```

## 인덱스

- `decks.is_public`, `decks.created_at`
- `decks.creator_session_id` — "내가 만든 덱" 조회용 (localStorage 백업)
- `likes.deck_id` — 덱별 좋아요 집계

## Row Level Security (RLS)

### Decks

- **SELECT**: `is_public = true` OR `creator_session_id = auth.uid()`
- **INSERT**: 누구나 (익명 세션 포함). `nickname` / `password_hash` 필수
- **UPDATE / DELETE**: RLS 로 차단 → **Server Action 에서 비밀번호 해시 검증 후 service_role 로 수행**

### Likes

- **SELECT**: 모두
- **INSERT**: `auth.uid() IS NOT NULL` (익명 세션도 OK), `user_id = auth.uid()`
- **DELETE**: `user_id = auth.uid()`
