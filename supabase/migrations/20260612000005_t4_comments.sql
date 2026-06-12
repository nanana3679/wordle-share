-- [T4] Comments: (deck_id, thread_date) 단위 댓글 thread (#47)
-- ADR 0007: 가시성 게이트(스포일러 방지)는 server action 책임.
-- comments 테이블은 client direct 접근 전면 금지 — RLS를 켜고 정책을 만들지
-- 않아 anon/authenticated의 모든 직접 접근을 차단한다 (service_role만 통과).

CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id uuid NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  -- 작성자 client local date 캡처 — 게이트 판정의 기준 날짜 (ADR 0007)
  thread_date date NOT NULL,
  anon_id uuid NOT NULL,
  -- 표시 disambiguation {nick}#{anon_id 앞 4hex}, '#' 불허 (ADR 0001)
  nick text NOT NULL
    CHECK (char_length(nick) BETWEEN 1 AND 20 AND nick NOT LIKE '%#%'),
  pw_hash text NOT NULL CHECK (pw_hash ~ '^\$2[aby]\$\d{2}\$.{53}$'),
  text text NOT NULL CHECK (char_length(text) BETWEEN 1 AND 500),
  deleted boolean NOT NULL DEFAULT false,
  hidden boolean NOT NULL DEFAULT false,
  report_count integer NOT NULL DEFAULT 0 CHECK (report_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- thread 조회 패턴: (deck, date) 그룹 최신순 (#47)
CREATE INDEX IF NOT EXISTS comments_deck_thread_created_idx
  ON public.comments (deck_id, thread_date, created_at DESC);

-- RLS: 정책 없음 = 전면 차단. 게이트 룰을 RLS에 넣지 않는다 (이슈 #47 명세 —
-- RLS는 방어적 fallback이며 게이트는 reader local date 의존이라 server action 전용)
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
