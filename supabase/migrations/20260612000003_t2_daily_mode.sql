-- [T2a] Daily mode 스키마: daily_words / daily_rounds (#71)
-- ADR 0015: DailyWord에 active_word_ids 스냅샷 (Word.id ASC 정렬), 라운드는 date만 캡처
-- ADR 0009: daily_rounds.version — 모든 액션에 expected_version 동봉하는 낙관적 락
-- 이슈 스케치의 bigint id는 T1a(uuid PK) 스키마에 맞춰 uuid로 적응

-- 1. daily_words — (deck, date)별 단어 lock. 첫 풀이자가 생성 (ON CONFLICT DO NOTHING)
CREATE TABLE IF NOT EXISTS public.daily_words (
  deck_id uuid NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  date date NOT NULL,
  -- 시드(hash(deck+date) % cardinality)로 active_word_ids에서 선택된 단어.
  -- 배열 원소는 Postgres FK가 검증하지 못하므로 word_id도 FK 없이 둔다 —
  -- 생성은 server action만 가능하고 words는 soft-delete라 dangling이 없다 (ADR 0015)
  word_id uuid NOT NULL,
  -- lock 생성 시점의 active word ID 스냅샷. Word.id ASC 정렬 강제 (셔플/시드 결정성)
  active_word_ids uuid[] NOT NULL CHECK (cardinality(active_word_ids) >= 1),
  locked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (deck_id, date)
);

-- 2. daily_rounds — (anon_id, deck, date)별 진행 상태
CREATE TABLE IF NOT EXISTS public.daily_rounds (
  anon_id uuid NOT NULL,
  deck_id uuid NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  date date NOT NULL,
  -- in_progress | completed(솔브) | failed(시도 소진/포기)
  status text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'failed')),
  -- [{ guess, result[], at }] — 본인 추측 기록
  attempts jsonb NOT NULL DEFAULT '[]',
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (anon_id, deck_id, date)
);

-- 3. RLS — 쓰기는 server action의 service_role만.
ALTER TABLE public.daily_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_rounds ENABLE ROW LEVEL SECURITY;

-- daily_words는 id만 담고 있어 공개해도 단어 텍스트가 새지 않는다
DROP POLICY IF EXISTS "daily_words_select_all" ON public.daily_words;
CREATE POLICY "daily_words_select_all" ON public.daily_words FOR SELECT USING (true);

-- 라운드는 본인 것만 조회 가능 (attempts에 본인 추측이 담긴다)
DROP POLICY IF EXISTS "daily_rounds_select_own" ON public.daily_rounds;
CREATE POLICY "daily_rounds_select_own" ON public.daily_rounds
  FOR SELECT USING (anon_id = auth.uid());
