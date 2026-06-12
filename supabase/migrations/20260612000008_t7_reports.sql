-- [T7] Reports: 신고 + 자동 가림 (#50, ADR 0013)
-- target_id가 polymorphic(deck/comment)이라 report_count/hidden 갱신은
-- DB 트리거가 아닌 server action에서 명시적으로 수행한다.

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('deck', 'comment')),
  target_id uuid NOT NULL,
  reporter_anon_id uuid NOT NULL,
  reason text CHECK (reason IS NULL OR char_length(reason) <= 200),
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- 같은 사용자가 같은 대상을 중복 신고해도 1회로 카운트 (ADR 0013 spam 방어)
  CONSTRAINT reports_unique_per_reporter UNIQUE (target_type, target_id, reporter_anon_id)
);

-- RLS: 정책 없음 = client direct 접근 전면 차단 (reporter_anon_id 노출 방지,
-- comments/likes와 동일 패턴). 모든 접근은 server action(service_role)만.
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
