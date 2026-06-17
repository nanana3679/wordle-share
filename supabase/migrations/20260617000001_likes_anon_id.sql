-- 좋아요 식별 기준을 IP hash에서 익명 세션으로 전환한다 (#161).
-- ip_hash는 abuse/rate-limit 분석용으로 보존하되 likedByMe와 toggle idempotency는 anon_id가 담당한다.

ALTER TABLE public.likes
  ADD COLUMN IF NOT EXISTS anon_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.likes
  ALTER COLUMN ip_hash DROP NOT NULL;

ALTER TABLE public.likes
  DROP CONSTRAINT IF EXISTS likes_pkey;

CREATE UNIQUE INDEX IF NOT EXISTS likes_deck_anon_uidx
  ON public.likes(deck_id, anon_id)
  WHERE anon_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_likes_deck_id
  ON public.likes(deck_id);

CREATE INDEX IF NOT EXISTS idx_likes_anon_id
  ON public.likes(anon_id);

CREATE INDEX IF NOT EXISTS idx_likes_ip_hash
  ON public.likes(ip_hash)
  WHERE ip_hash IS NOT NULL;
