-- 덱 대표 이미지. 쓰기는 server action(service_role)만 수행하고, 읽기는 공개 URL로 제공한다.

ALTER TABLE public.decks
  ADD COLUMN IF NOT EXISTS image_url text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'deck-images',
  'deck-images',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "deck_images_public_read" ON storage.objects;
CREATE POLICY "deck_images_public_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'deck-images');
