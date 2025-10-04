# 데이터베이스 스키마

## Users 테이블 (Supabase Auth에서 자동 생성)

- `id`: UUID (Primary Key)
- `email`: 이메일 주소 (소셜 계정에서 가져옴)
- `provider`: 인증 제공자 (google, github)
- `created_at`: 계정 생성일시
- `updated_at`: 정보 수정일시

## Profiles 테이블

- `id`: UUID (Primary Key, Users.id와 연결)
- `display_name`: 표시명 (소셜 계정에서 가져옴)
- `avatar_url`: 프로필 이미지 URL (소셜 계정에서 가져옴)
- `provider_id`: 소셜 계정 고유 ID
- `created_at`: 프로필 생성일시
- `updated_at`: 프로필 수정일시

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
- `deck_id`: 덱 ID (Foreign Key)
- `ip_address`: IP 주소
- `created_at`: 좋아요 누른 시간

## 관계

```
Users (1) ──── (1) Profiles
  │
  └── (1) ──── (N) Decks
                 │
                 └── (1) ──── (N) Likes
```

## 인덱스 (성능 최적화)

- `decks.creator_id` - 사용자별 덱 조회
- `decks.is_public` - 공개 덱 필터링
- `decks.created_at` - 최신순 정렬
- `likes.deck_id` - 덱별 좋아요 개수
- `likes.ip_address` - IP 중복 체크

## Row Level Security (RLS) 정책

### Decks 테이블

- **SELECT**: 공개 덱 OR 소유자
- **INSERT**: 인증된 사용자
- **UPDATE**: 소유자만
- **DELETE**: 소유자만

### Profiles 테이블

- **SELECT**: 모두
- **INSERT**: 본인만
- **UPDATE**: 본인만
- **DELETE**: 본인만

### Likes 테이블

- **SELECT**: 모두
- **INSERT**: 모두 (IP 중복 체크는 애플리케이션 레벨)
- **DELETE**: 없음 (좋아요 취소 미지원)
