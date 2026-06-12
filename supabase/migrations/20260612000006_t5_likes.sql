-- [T5] Likes: IP 해시 단독 식별 좋아요 + like_count 트리거 동기화 (#48)
-- ADR 0002: PK (deck_id, ip_hash) — IP당 한 덱에 1좋아요. 풀이 무관 누구나 가능.
-- decks.like_count는 캐시 컬럼 — 트리거가 COUNT(likes)와 항상 일치시킨다.

CREATE TABLE IF NOT EXISTS public.likes (
  deck_id uuid NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  -- SHA-256(req.ip + 고정 salt) hex — 원본 IP는 저장하지 않는다 (개인정보 최소화)
  ip_hash text NOT NULL CHECK (ip_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (deck_id, ip_hash)
);

-- like_count 동기화 트리거 (insert → +1, delete → -1)
CREATE OR REPLACE FUNCTION public.sync_deck_like_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.decks SET like_count = like_count + 1 WHERE id = NEW.deck_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.decks SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.deck_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS likes_sync_count ON public.likes;
CREATE TRIGGER likes_sync_count
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_deck_like_count();

-- RLS: 정책 없음 = client direct 접근 전면 차단.
-- ip_hash가 담기므로 직접 조회를 막고, 모든 read/write는 server action(service_role)만.
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
