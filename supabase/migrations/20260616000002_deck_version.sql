-- 덱 편집 액션 낙관적 락. 클라이언트는 읽은 version을 expectedVersion으로 동봉한다.

ALTER TABLE public.decks
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0 CHECK (version >= 0);
