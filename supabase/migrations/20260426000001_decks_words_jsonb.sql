-- =============================================
-- decks.words: TEXT[] -> JSONB ({word, tags}[])
-- decks.categories: TEXT[] (덱 단위 카테고리 팔레트) 추가
-- validate_words(TEXT[]) dead code 제거 (컬럼이 JSONB로 전환되어 무의미)
-- 멱등적으로 작성: 이미 적용된 환경에서도 안전하게 재실행 가능.
-- =============================================

BEGIN;

-- 0) dead code 제거: 어디에서도 호출되지 않으며, 시그니처가 새 스키마와 불일치
DROP FUNCTION IF EXISTS public.validate_words(text[]);

-- 1) categories 컬럼 추가 (이미 있으면 skip)
ALTER TABLE public.decks
  ADD COLUMN IF NOT EXISTS categories TEXT[] NOT NULL DEFAULT '{}';

-- 2) words 컬럼: TEXT[] -> JSONB로 변환 + backfill
DO $$
DECLARE
  current_data_type TEXT;
BEGIN
  SELECT data_type
    INTO current_data_type
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'decks'
     AND column_name = 'words';

  -- 이미 JSONB라면 아무 것도 하지 않음 (멱등)
  IF current_data_type = 'ARRAY' THEN
    -- TEXT[] -> JSONB:
    --   NULL 또는 빈 배열은 '[]'::jsonb,
    --   각 요소는 {"word": <text>, "tags": []} 객체로 변환.
    ALTER TABLE public.decks
      ALTER COLUMN words DROP DEFAULT;

    ALTER TABLE public.decks
      ALTER COLUMN words TYPE JSONB
      USING (
        CASE
          WHEN words IS NULL THEN '[]'::jsonb
          ELSE COALESCE(
            (
              SELECT jsonb_agg(jsonb_build_object('word', w, 'tags', '[]'::jsonb))
                FROM unnest(words) AS w
            ),
            '[]'::jsonb
          )
        END
      );

    ALTER TABLE public.decks
      ALTER COLUMN words SET DEFAULT '[]'::jsonb;

    -- 기존에 NULL이 들어있던 행이 있다면 빈 배열로 정리 후 NOT NULL 부여
    UPDATE public.decks SET words = '[]'::jsonb WHERE words IS NULL;

    ALTER TABLE public.decks
      ALTER COLUMN words SET NOT NULL;
  END IF;
END
$$;

COMMIT;
