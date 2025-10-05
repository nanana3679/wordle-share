# 데이터베이스 스키마

## Users 테이블 (Supabase Auth에서 자동 생성)

Supabase의 `auth.users` 테이블을 직접 사용합니다.

### Supabase User 타입 구조

```typescript
interface User {
  id: string;                    // UUID (Primary Key)
  aud: string;                   // 오디언스 클레임
  role?: string;                 // Postgres RLS 역할
  email?: string;                // 이메일 주소 (Google 계정)
  email_confirmed_at?: string;   // 이메일 확인 타임스탬프
  phone?: string;                // 전화번호
  phone_confirmed_at?: string;   // 전화번호 확인 타임스탬프
  confirmed_at?: string;         // 이메일 또는 전화번호 확인 타임스탬프
  last_sign_in_at?: string;      // 마지막 로그인 타임스탬프
  app_metadata: Record<string, any>;     // 앱 메타데이터
  user_metadata: Record<string, any>;    // 사용자 메타데이터 (Google OAuth 정보)
  identities: any[];             // 인증 방법들 배열
  created_at: string;            // 계정 생성일시
  updated_at: string;            // 정보 수정일시
  is_anonymous: boolean;         // 익명 사용자 여부
}
```

## Decks 테이블

- `id`: UUID (Primary Key)
- `name`: 덱 이름
- `description`: 덱 설명
- `words`: 단어 배열 (JSON)
- `thumbnail_url`: 썸네일 이미지 URL
- `is_public`: 공개 여부
- `created_at`: 생성일시
- `updated_at`: 수정일시
- `creator_id`: 생성자 ID (Users.id와 연결)

## Likes 테이블

- `id`: UUID (Primary Key)
- `deck_id`: 덱 ID (Foreign Key, Decks.id)
- `user_id`: 사용자 ID (Nullable, auth.users.id - 로그인 사용자)
- `ip_address`: IP 주소 (Nullable - 비로그인 사용자)
- `created_at`: 좋아요 누른 시간

**중복 체크 로직:**
- 로그인: `deck_id` + `user_id` 유니크 제약
- 비로그인: `deck_id` + `ip_address` 유니크 제약

## 관계

```
Users (1) ──── (N) Decks
               │
               └── (1) ──── (N) Likes
```

## 인덱스 (성능 최적화)

- `decks.creator_id` - 사용자별 덱 조회
- `decks.is_public` - 공개 덱 필터링
- `decks.created_at` - 최신순 정렬
- `likes.deck_id` - 덱별 좋아요 개수
- `likes(deck_id, user_id)` - 로그인 사용자 중복 체크 (유니크)
- `likes(deck_id, ip_address)` - 비로그인 사용자 중복 체크 (유니크)

## Row Level Security (RLS) 정책

### Decks 테이블

- **SELECT**: 공개 덱 OR 소유자
- **INSERT**: 인증된 사용자
- **UPDATE**: 소유자만
- **DELETE**: 소유자만

### Likes 테이블

- **SELECT**: 모두
- **INSERT**: 모두
  - 로그인: `user_id` + `deck_id` 유니크 제약으로 중복 방지
  - 비로그인: `ip_address` + `deck_id` 유니크 제약으로 중복 방지
- **DELETE**: 본인만 (로그인 사용자), 비로그인은 삭제 불가
