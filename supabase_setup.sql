-- ============================================================
--  FIFA 2026 Prediction App — Fix predictions table
--  participants & actual_scores are intact — DO NOT touch them
--  Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Drop and recreate predictions with correct schema ────────
DROP TABLE IF EXISTS predictions CASCADE;

CREATE TABLE predictions (
  id           BIGSERIAL PRIMARY KEY,
  player_name  TEXT NOT NULL,
  match_id     INTEGER NOT NULL,
  score1       INTEGER NOT NULL CHECK (score1 >= 0),
  score2       INTEGER NOT NULL CHECK (score2 >= 0),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (player_name, match_id)
);

-- ── Auto-update trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS predictions_updated_at ON predictions;
CREATE TRIGGER predictions_updated_at
  BEFORE UPDATE ON predictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public can read predictions"       ON predictions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Public can insert predictions"     ON predictions FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Public can update own predictions" ON predictions FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── DONE ─────────────────────────────────────────────────────
-- predictions table is fixed. Players can now log in and
-- re-enter their predictions. participants & actual_scores untouched.
-- ============================================================
