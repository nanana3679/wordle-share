-- [T6a] Feed/search 정렬 인덱스 (#75)
-- 피드/검색의 모든 쿼리는 hidden = false 필터를 동반하므로 partial index로 만든다.

-- Hot/좋아요순
CREATE INDEX IF NOT EXISTS idx_decks_likes_visible
  ON public.decks (like_count DESC)
  WHERE hidden = false;

-- 최신순
CREATE INDEX IF NOT EXISTS idx_decks_created_visible
  ON public.decks (created_at DESC)
  WHERE hidden = false;

-- 덱 이름 키워드 검색 (ILIKE '%q%' 부분 일치 지원 — 단어 내용 검색은 의도적으로 없음, ADR 0008)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_decks_name_visible
  ON public.decks USING gin (name gin_trgm_ops)
  WHERE hidden = false;
