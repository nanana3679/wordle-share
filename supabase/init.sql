-- =============================================
-- Wordle Share - Supabase 초기 설정 SQL
-- =============================================

-- 1. Decks 테이블
CREATE TABLE public.decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  description TEXT,
  -- words: [{ "word": string, "tags": string[] }, ...]
  words JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- categories: 덱 단위 카테고리(태그 axes) 팔레트
  categories TEXT[] NOT NULL DEFAULT '{}',
  thumbnail_url TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_handle TEXT,
  author_password_hash TEXT,
  CONSTRAINT decks_author_xor CHECK (
    (creator_id IS NOT NULL AND author_handle IS NULL AND author_password_hash IS NULL)
    OR
    (creator_id IS NULL AND author_handle IS NOT NULL AND author_password_hash IS NOT NULL)
  ),
  -- anon 키로 평문이 해시 칼럼에 들어가 compare가 예측 불가하게 실패하는 것을 막음
  CONSTRAINT decks_author_password_hash_format CHECK (
    author_password_hash IS NULL
    OR author_password_hash ~ '^\$2[aby]\$\d{2}\$.{53}$'
  )
);

-- 2. Likes 테이블
CREATE TABLE public.likes (
  deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (deck_id, user_id)
);

-- 3. 인덱스
CREATE INDEX idx_decks_creator_id ON public.decks(creator_id);
CREATE INDEX idx_decks_is_public ON public.decks(is_public);
CREATE INDEX idx_decks_created_at ON public.decks(created_at DESC);
CREATE INDEX idx_likes_deck_id ON public.likes(deck_id);

-- 4. validate_words 함수 (database.ts에 정의됨)
CREATE OR REPLACE FUNCTION public.validate_words(words TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- 배열이 비어있으면 false
  IF array_length(words, 1) IS NULL THEN
    RETURN false;
  END IF;
  RETURN true;
END;
$$;

-- 5. RLS 활성화
ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- 6. Decks RLS 정책
CREATE POLICY "공개 덱은 누구나 조회 가능"
  ON public.decks FOR SELECT
  USING (is_public = true);

CREATE POLICY "소유자는 자신의 덱 조회 가능"
  ON public.decks FOR SELECT
  USING (auth.uid() = creator_id);

CREATE POLICY "인증된 사용자는 덱 생성 가능"
  ON public.decks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "익명 사용자는 공개 덱 생성 가능"
  ON public.decks FOR INSERT
  TO anon
  WITH CHECK (
    creator_id IS NULL
    AND author_handle IS NOT NULL
    AND author_password_hash IS NOT NULL
    AND is_public = true
  );

CREATE POLICY "소유자만 덱 수정 가능"
  ON public.decks FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "소유자만 덱 삭제 가능"
  ON public.decks FOR DELETE
  TO authenticated
  USING (auth.uid() = creator_id);

-- 7. Likes RLS 정책
CREATE POLICY "좋아요는 누구나 조회 가능"
  ON public.likes FOR SELECT
  USING (true);

CREATE POLICY "인증된 사용자만 좋아요 추가 가능"
  ON public.likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "본인의 좋아요만 삭제 가능"
  ON public.likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 8. Storage 버킷 (deck-thumbnails)
-- Supabase SQL Editor에서 실행
INSERT INTO storage.buckets (id, name, public)
VALUES ('deck-thumbnails', 'deck-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- 9. Storage RLS 정책
CREATE POLICY "썸네일 누구나 조회 가능"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'deck-thumbnails');

CREATE POLICY "인증된 사용자 썸네일 업로드 가능"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'deck-thumbnails');

CREATE POLICY "인증된 사용자 썸네일 수정 가능"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'deck-thumbnails');

CREATE POLICY "인증된 사용자 썸네일 삭제 가능"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'deck-thumbnails');
