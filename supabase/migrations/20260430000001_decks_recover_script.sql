-- =============================================
-- decks.script 복구
--
-- 사정: 20260428000001_decks_script 마이그레이션이 BEGIN/COMMIT으로
-- 자기 트랜잭션을 명시했고, supabase CLI의 외부 트랜잭션과 nested 처리되면서
-- migration history에는 등록됐으나 ADD COLUMN script는 prod에 반영되지
-- 않은 상태가 발생. 20260429000001_decks_recover_categories와 동일한 케이스.
--
-- 멱등적이므로 이미 컬럼이 존재하는 dev 등 다른 환경에서는 skip된다.
-- =============================================

ALTER TABLE public.decks
  ADD COLUMN IF NOT EXISTS script TEXT NOT NULL DEFAULT 'latin';
