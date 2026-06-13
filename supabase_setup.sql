-- ============================================================
--  FIFA 2026 Prediction App — Supabase Database Setup
--  Run this entire script in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. PARTICIPANTS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS participants (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  email       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. PREDICTIONS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS predictions (
  id           BIGSERIAL PRIMARY KEY,
  player_name  TEXT NOT NULL,
  match_id     INTEGER NOT NULL,
  score1       INTEGER NOT NULL CHECK (score1 >= 0),
  score2       INTEGER NOT NULL CHECK (score2 >= 0),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (player_name, match_id)
);

-- ── 3. ACTUAL SCORES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS actual_scores (
  match_id    INTEGER PRIMARY KEY,
  score1      INTEGER NOT NULL CHECK (score1 >= 0),
  score2      INTEGER NOT NULL CHECK (score2 >= 0),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. AUTO-UPDATE updated_at TRIGGER ────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER predictions_updated_at
  BEFORE UPDATE ON predictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER actual_scores_updated_at
  BEFORE UPDATE ON actual_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 5. ENABLE ROW LEVEL SECURITY ─────────────────────────────
ALTER TABLE participants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE actual_scores ENABLE ROW LEVEL SECURITY;

-- ── 6. RLS POLICIES — participants ───────────────────────────
CREATE POLICY "Public can read participants"
  ON participants FOR SELECT USING (true);

CREATE POLICY "Public can add participants"
  ON participants FOR INSERT WITH CHECK (true);

-- ── 7. RLS POLICIES — predictions ────────────────────────────
CREATE POLICY "Public can read predictions"
  ON predictions FOR SELECT USING (true);

CREATE POLICY "Public can insert predictions"
  ON predictions FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update own predictions"
  ON predictions FOR UPDATE USING (true);

-- ── 8. RLS POLICIES — actual_scores ──────────────────────────
CREATE POLICY "Public can read actual scores"
  ON actual_scores FOR SELECT USING (true);

CREATE POLICY "Public can insert actual scores"
  ON actual_scores FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update actual scores"
  ON actual_scores FOR UPDATE USING (true);

-- ── 9. SEED: Add first participant (Saju) ────────────────────
INSERT INTO participants (name, email)
VALUES ('Saju', 'zajuzam@outlook.com')
ON CONFLICT (name) DO NOTHING;

-- ── DONE ─────────────────────────────────────────────────────
-- Your tables are ready. Open the website and all saves will
-- go to Supabase instead of (just) the browser cache.
-- ============================================================
