-- =============================================
-- decks.categories: 덱 분류 태그 배열.
-- 이전에 Supabase Studio에서 직접 생성됐던 컬럼을 마이그레이션으로 정합화.
-- 멱등적으로 작성: 이미 적용된 환경에서도 안전하게 재실행 가능.
-- =============================================

ALTER TABLE public.decks
  ADD COLUMN IF NOT EXISTS categories TEXT[] NOT NULL DEFAULT '{}';
