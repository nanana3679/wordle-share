-- =============================================
-- decks.script: 다중 쓰기체계(라틴/키릴/그리스/한글/가나/히브리/아랍 등) 지원을 위한
-- 덱 단위 script 식별자. 향후 ScriptAdapter 추상화에서 사용.
-- 멱등적으로 작성: 이미 적용된 환경에서도 안전하게 재실행 가능.
--
-- 인덱스/CHECK 제약은 의도적으로 추가하지 않는다.
-- (향후 새로운 script 값 추가 시 마이그레이션 없이 확장 가능하도록)
-- =============================================

BEGIN;

ALTER TABLE public.decks
  ADD COLUMN IF NOT EXISTS script TEXT NOT NULL DEFAULT 'latin';

COMMIT;
