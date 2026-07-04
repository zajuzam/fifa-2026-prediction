-- ============================================================
--  FIFA 2026 Prediction App — Sync knockout team names
--  Root cause: knockoutTeams (R16/QF/SF/Final team assignments)
--  was only ever saved to the admin's own browser localStorage,
--  never to Supabase — so other players never saw admin updates.
--  participants, predictions, actual_scores are untouched.
--  Run in: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS knockout_teams (
  match_id     INTEGER PRIMARY KEY,
  team1        TEXT NOT NULL DEFAULT 'TBD',
  team2        TEXT NOT NULL DEFAULT 'TBD',
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Auto-update trigger (reuses existing function if present) ─
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS knockout_teams_updated_at ON knockout_teams;
CREATE TRIGGER knockout_teams_updated_at
  BEFORE UPDATE ON knockout_teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE knockout_teams ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public can read knockout_teams"   ON knockout_teams FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Public can insert knockout_teams" ON knockout_teams FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Public can update knockout_teams" ON knockout_teams FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── DONE ─────────────────────────────────────────────────────
-- knockout_teams table created. Admin-set R16/QF/SF/Final team
-- names will now sync to every player instead of staying local.
-- ============================================================
