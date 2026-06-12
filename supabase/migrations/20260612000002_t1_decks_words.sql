-- [T1a] 신규 도메인 스키마: decks + words (#68)
-- T0(#43)에서 구 테이블이 drop된 greenfield 상태 위에 생성한다.
-- ADR 0001: anon_id(auth.uid) + 단일 nick/pw — creator_id·creator_nick·creator_pw_hash 모두 필수
-- ADR 0010: word 영구 ID + active soft-delete + UNIQUE(deck_id, text)
-- ADR 0014: text는 NFC 정규화된 canonical form으로 저장 (정규화는 app 레벨)

-- 1. decks
CREATE TABLE IF NOT EXISTS public.decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  script text NOT NULL DEFAULT 'latin' CHECK (script IN ('latin', 'hangul', 'kana')),
  -- anon_id. auth.users FK를 걸지 않는다: 익명 유저가 정리(GC)되어도
  -- 덱은 nick/pw 자격증명으로 영구 접근 가능해야 한다 (ADR 0001)
  creator_id uuid NOT NULL,
  -- nick에 '#' 불허 — 표시 형식 {nick}#{anon_id 앞 4hex}와 충돌 방지 (ADR 0001)
  creator_nick text NOT NULL
    CHECK (char_length(creator_nick) BETWEEN 1 AND 20 AND creator_nick NOT LIKE '%#%'),
  -- bcrypt 해시 형식 강제 (평문 저장 사고 방지)
  creator_pw_hash text NOT NULL
    CHECK (creator_pw_hash ~ '^\$2[aby]\$\d{2}\$.{53}$'),
  like_count integer NOT NULL DEFAULT 0 CHECK (like_count >= 0),
  hidden boolean NOT NULL DEFAULT false,
  report_count integer NOT NULL DEFAULT 0 CHECK (report_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. words (영구 ID + soft-delete, ADR 0010)
CREATE TABLE IF NOT EXISTS public.words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id uuid NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  text text NOT NULL CHECK (char_length(text) BETWEEN 1 AND 50),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- 같은 덱 안에서 동일 text는 단일 row 영구 보유 (재추가 = active toggle)
  CONSTRAINT words_deck_id_text_unique UNIQUE (deck_id, text)
);

-- 활성 단어 집합 조회용 (WHERE deck_id = ? AND active = true)
CREATE INDEX IF NOT EXISTS words_deck_id_active_idx
  ON public.words (deck_id) WHERE active;

-- 3. RLS — SELECT 전체 공개 (hidden 필터는 app 레벨, 이슈 #68 명세).
--    쓰기 정책 없음: 모든 mutation은 server action에서 service_role로 수행한다.
ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "decks_select_all" ON public.decks;
CREATE POLICY "decks_select_all" ON public.decks FOR SELECT USING (true);

DROP POLICY IF EXISTS "words_select_all" ON public.words;
CREATE POLICY "words_select_all" ON public.words FOR SELECT USING (true);
