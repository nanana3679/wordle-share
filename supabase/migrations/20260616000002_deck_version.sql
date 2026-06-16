-- 덱 편집 액션 낙관적 락. 클라이언트는 읽은 version을 expectedVersion으로 동봉한다.

ALTER TABLE public.decks
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0 CHECK (version >= 0);

CREATE OR REPLACE FUNCTION public.update_deck_words_with_version(
  p_deck_id uuid,
  p_expected_version integer,
  p_insert_texts text[],
  p_reactivate_ids uuid[],
  p_deactivate_ids uuid[]
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.decks
  SET version = version + 1,
      updated_at = now()
  WHERE id = p_deck_id
    AND version = p_expected_version;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RETURN false;
  END IF;

  INSERT INTO public.words (deck_id, text)
  SELECT p_deck_id, inserted_text.text_value
  FROM unnest(coalesce(p_insert_texts, ARRAY[]::text[])) AS inserted_text(text_value);

  UPDATE public.words
  SET active = true
  WHERE deck_id = p_deck_id
    AND id = ANY(coalesce(p_reactivate_ids, ARRAY[]::uuid[]));

  UPDATE public.words
  SET active = false
  WHERE deck_id = p_deck_id
    AND id = ANY(coalesce(p_deactivate_ids, ARRAY[]::uuid[]));

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.update_deck_words_with_version(uuid, integer, text[], uuid[], uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_deck_words_with_version(uuid, integer, text[], uuid[], uuid[]) TO service_role;
