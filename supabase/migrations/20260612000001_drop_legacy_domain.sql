-- T0 Foundation reset (#43): 구 도메인 테이블/스토리지 정리
-- 신규 schema(T1a) 도입 전 greenfield 상태를 만든다. 데이터 이행 없음.
-- 멱등적으로 작성: 이미 정리된 환경에서 재실행해도 에러가 나지 않는다.

-- 1. 구 도메인 테이블 drop (likes가 decks를 FK 참조하므로 likes 먼저)
DROP TABLE IF EXISTS public.likes CASCADE;
DROP TABLE IF EXISTS public.decks CASCADE;

-- 2. Storage RLS 정책 제거 (deck-thumbnails 전용 정책)
DROP POLICY IF EXISTS "썸네일 누구나 조회 가능" ON storage.objects;
DROP POLICY IF EXISTS "인증된 사용자 썸네일 업로드 가능" ON storage.objects;
DROP POLICY IF EXISTS "인증된 사용자 썸네일 수정 가능" ON storage.objects;
DROP POLICY IF EXISTS "인증된 사용자 썸네일 삭제 가능" ON storage.objects;

-- 3. deck-thumbnails 버킷 비우고 삭제
DELETE FROM storage.objects WHERE bucket_id = 'deck-thumbnails';
DELETE FROM storage.buckets WHERE id = 'deck-thumbnails';
