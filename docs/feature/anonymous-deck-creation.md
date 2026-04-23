# 익명 덱 작성

로그인하지 않아도 표시 이름 + 비밀번호만으로 공개 덱을 만들 수 있게 한 기능.
수정·삭제(비밀번호 프롬프트)는 후속 PR에서 다룬다.

## 결정 사항

- **익명 덱은 항상 공개**. 비공개 허용 시 본인 외 접근 경로가 없어 무의미
- **썸네일 업로드 미지원**. Storage RLS가 authenticated 전제 — 별도 PR에서 확장
- **비밀번호 해싱**: `bcryptjs` (순수 JS, 솔트·알고리즘 버전이 해시 문자열에 내장되어 저장 실수 방지)
- **해시 노출 방지**: `getDeck`/`getDecks`의 select를 `*` 대신 화이트리스트 컬럼 목록으로 대체해 `author_password_hash`를 응답에서 제외

## 데이터 모델

`decks` 테이블에 두 컬럼 추가:

- `author_handle TEXT` — 표시 이름 (2~20자)
- `author_password_hash TEXT` — bcrypt 해시

CHECK 제약으로 `creator_id` XOR `(author_handle, author_password_hash)` 강제.
둘 다 채워지거나 둘 다 비어있는 상태를 차단해 소유권 식별자 혼동을 막는다.

## RLS

INSERT 정책 분리:

- `authenticated` → 기존 `auth.uid() = creator_id`
- `anon` → `creator_id IS NULL AND author_handle IS NOT NULL AND author_password_hash IS NOT NULL AND is_public = true`

SELECT는 기존 "공개 덱 누구나" 정책이 익명 덱도 커버한다(익명은 항상 공개).

## 플로우

```
비로그인 사용자 → 덱 만들기 버튼 → DeckDialog (익명 분기)
  표시 이름 / 비밀번호 / 단어 입력
    → createAnonymousDeck(formData)
      → 필드 검증 → parseWordsString → bcrypt.hash(password, 10)
      → decks insert (creator_id=null, is_public=true)
    → revalidate → 덱 목록 새로고침
```

## 주요 파일

- `supabase/init.sql` — 컬럼·CHECK·anon INSERT 정책
- `types/database.ts` — 신규 컬럼 타입
- `app/actions/deck.ts` — `createAnonymousDeck`, 해시 노출 방지 select
- `components/decks/DeckDialog.tsx` — `useAuth()`로 익명 분기, handle/password 필드
- `components/decks/DeckDetailStatic.tsx` — `author_handle` 표시 폴백

## 후속 작업

- 익명 수정/삭제 (비밀번호 프롬프트 모달 + `updateDeck`/`deleteDeck` 분기)
- 익명 썸네일 업로드 (Storage RLS 설계 포함)
