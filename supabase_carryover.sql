-- ============================================================
--  FIFA 2026 — Restore leaderboard carryover points
--  Run in: Supabase Dashboard → SQL Editor
--  This preserves all historical points before the data loss.
-- ============================================================

-- ── 1. Add carryover columns to participants ─────────────────
ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS carryover_points      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS carryover_exact       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS carryover_correct     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS carryover_predictions INTEGER DEFAULT 0;

-- ── 2. Seed carryover data from leaderboard screenshot ───────
UPDATE participants SET carryover_points=28, carryover_exact=4,  carryover_correct=16, carryover_predictions=29 WHERE name='Albert';
UPDATE participants SET carryover_points=25, carryover_exact=4,  carryover_correct=13, carryover_predictions=29 WHERE name='Gooner';
UPDATE participants SET carryover_points=19, carryover_exact=3,  carryover_correct=10, carryover_predictions=29 WHERE name='Uday kamath';
UPDATE participants SET carryover_points=16, carryover_exact=1,  carryover_correct=13, carryover_predictions=28 WHERE name='Binu Thankachan';
UPDATE participants SET carryover_points=16, carryover_exact=1,  carryover_correct=13, carryover_predictions=29 WHERE name='AB';
UPDATE participants SET carryover_points=13, carryover_exact=2,  carryover_correct=7,  carryover_predictions=26 WHERE name='Axa';
UPDATE participants SET carryover_points=8,  carryover_exact=1,  carryover_correct=5,  carryover_predictions=18 WHERE name='Neethu';
UPDATE participants SET carryover_points=8,  carryover_exact=0,  carryover_correct=8,  carryover_predictions=11 WHERE name='sanketh';
UPDATE participants SET carryover_points=7,  carryover_exact=1,  carryover_correct=4,  carryover_predictions=8  WHERE name='Naveen M';
UPDATE participants SET carryover_points=7,  carryover_exact=1,  carryover_correct=4,  carryover_predictions=10 WHERE name='Kiran';
UPDATE participants SET carryover_points=3,  carryover_exact=0,  carryover_correct=3,  carryover_predictions=7  WHERE name='PaulsonK';
-- Players with 0 points remain at default (0) — no update needed

-- ── DONE ─────────────────────────────────────────────────────
-- Carryover points are now stored. The app will automatically
-- add these to any new predictions going forward.
-- ============================================================
