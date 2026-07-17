-- Creator Ziele: Ziele, Mindestbetrag und Anforderungen
ALTER TABLE public.creators
  ADD COLUMN IF NOT EXISTS goal_value              NUMERIC,
  ADD COLUMN IF NOT EXISTS goal_type               TEXT,
  ADD COLUMN IF NOT EXISTS goal_period             TEXT,
  ADD COLUMN IF NOT EXISTS weitere_ziele           TEXT,
  ADD COLUMN IF NOT EXISTS min_kooperation_betrag  NUMERIC,
  ADD COLUMN IF NOT EXISTS wunsche_anforderungen   TEXT;
