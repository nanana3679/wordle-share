-- [T3a] Challenge mode 스키마: challenge_runs (#73)
-- ADR 0006: (anon_id, deck_id, date) 1일 1회 — PK가 두 번째 시작을 차단
-- ADR 0015: shuffle_order는 결정적 셔플 결과를 영구 저장 (재계산 X)
-- ADR 0009: 상태성 레코드는 version 낙관적 락 보유 — 이슈 스케치에 없지만 ADR이 요구
-- 이슈 스케치의 bigint id는 T1a(uuid PK) 스키마에 맞춰 uuid로 적응

CREATE TABLE IF NOT EXISTS public.challenge_runs (
  anon_id uuid NOT NULL,
  deck_id uuid NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  date date NOT NULL,
  -- deterministic_shuffle(daily_words.active_word_ids, hash(deck+date+"endurance")) 결과.
  -- 배열 원소 FK는 불가 — 생성은 server action 전용 (ADR 0015)
  shuffle_order uuid[] NOT NULL CHECK (cardinality(shuffle_order) >= 1),
  current_round integer NOT NULL DEFAULT 0 CHECK (current_round >= 0),
  score integer NOT NULL DEFAULT 0 CHECK (score >= 0),
  -- NULL(진행 중) | completed(전체 클리어) | failed(시도 소진/포기)
  ended_reason text CHECK (ended_reason IN ('completed', 'failed')),
  -- 현재 라운드의 추측 기록 [{ units, states, at }] — 라운드 전환 시 비움
  attempts jsonb NOT NULL DEFAULT '[]',
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (anon_id, deck_id, date)
);

-- RLS — 쓰기는 server action의 service_role만. 본인 run만 조회 가능.
ALTER TABLE public.challenge_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "challenge_runs_select_own" ON public.challenge_runs;
CREATE POLICY "challenge_runs_select_own" ON public.challenge_runs
  FOR SELECT USING (anon_id = auth.uid());
