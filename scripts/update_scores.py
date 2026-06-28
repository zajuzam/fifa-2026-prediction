"""
FIFA 2026 Score Auto-Updater
Runs daily at 5 AM EDT (09:00 UTC) via GitHub Actions.
Fetches completed match scores from ESPN API and saves them to Supabase.
"""

import os, json, datetime, requests
from supabase import create_client

# ── CONFIG ────────────────────────────────────────────────────────────────────
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]

# ESPN team name → our app team name mapping
ESPN_NAME_MAP = {
    "USA":                          "United States",
    "United States":                "United States",
    "Turkey":                       "Turkiye",
    "Türkiye":                      "Turkiye",
    "Bosnia-Herzegovina":           "Bosnia & Herz.",
    "Bosnia and Herzegovina":       "Bosnia & Herz.",
    "Bosnia & Herzegovina":         "Bosnia & Herz.",
    "Côte d'Ivoire":                "Ivory Coast",
    "Cote d'Ivoire":                "Ivory Coast",
    "Ivory Coast":                  "Ivory Coast",
    "Czech Republic":               "Czechia",
    "DR Congo":                     "DR Congo",
    "Congo DR":                     "DR Congo",
    "Democratic Republic of Congo": "DR Congo",
    "Korea Republic":               "South Korea",
    "Republic of Korea":            "South Korea",
    "New Zealand":                  "New Zealand",
    "Curacao":                      "Curacao",
    "Curaçao":                      "Curacao",
    "Cape Verde":                   "Cape Verde",
    "Cabo Verde":                   "Cape Verde",
}

def normalize(name: str) -> str:
    """Normalize an ESPN team name to our app's name."""
    return ESPN_NAME_MAP.get(name, name)

def load_matches() -> list:
    """Load our match definitions from matches.json."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(script_dir, "matches.json")) as f:
        return json.load(f)

def fetch_espn_scores(date_str: str) -> list:
    """
    Fetch completed match scores from ESPN for a given date (YYYYMMDD).
    Returns list of {team1, team2, score1, score2} dicts for finished games.
    """
    url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates={date_str}"
    try:
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        print(f"  ESPN API error for {date_str}: {e}")
        return []

    results = []
    for event in data.get("events", []):
        comps = event.get("competitions", [{}])[0]
        status = comps.get("status", {}).get("type", {}).get("name", "")
        if status not in ("STATUS_FINAL", "STATUS_FULL_TIME"):
            continue  # Skip in-progress or future matches

        competitors = comps.get("competitors", [])
        if len(competitors) != 2:
            continue

        # ESPN competitor order: index 0 = home, index 1 = away
        home = competitors[0]
        away = competitors[1]

        home_name  = normalize(home["team"]["displayName"])
        away_name  = normalize(away["team"]["displayName"])
        home_score = int(home.get("score", 0))
        away_score = int(away.get("score", 0))

        results.append({
            "team1": home_name, "team2": away_name,
            "score1": home_score, "score2": away_score,
        })
        print(f"  ESPN: {home_name} {home_score}–{away_score} {away_name}")

    return results

def match_to_our_id(espn_result: dict, our_matches: list) -> int | None:
    """
    Find our match ID for an ESPN result by matching team names.
    Tries both team orderings (home/away may differ from our data).
    """
    t1, t2 = espn_result["team1"], espn_result["team2"]
    for m in our_matches:
        if (m["team1"] == t1 and m["team2"] == t2):
            return m["id"], False   # normal order
        if (m["team1"] == t2 and m["team2"] == t1):
            return m["id"], True    # reversed — swap scores
    return None, False

def run():
    print(f"\n{'='*50}")
    print(f"FIFA 2026 Score Updater — {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}")
    print(f"{'='*50}")

    # Only run within the tournament window
    today_utc = datetime.date.today()
    start     = datetime.date(2026, 6, 11)
    end       = datetime.date(2026, 7, 20)   # day after Final
    if not (start <= today_utc <= end):
        print("Outside tournament window — nothing to do.")
        return

    our_matches = load_matches()
    db = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Check yesterday AND the day before (catches late-night games that ended near midnight)
    dates_to_check = [
        (today_utc - datetime.timedelta(days=1)).strftime("%Y%m%d"),
        (today_utc - datetime.timedelta(days=2)).strftime("%Y%m%d"),
    ]

    updated = 0
    skipped = 0

    for date_str in dates_to_check:
        print(f"\nFetching ESPN scores for {date_str[:4]}-{date_str[4:6]}-{date_str[6:]}...")
        espn_results = fetch_espn_scores(date_str)

        if not espn_results:
            print("  No completed matches found.")
            continue

        for result in espn_results:
            match_id, swapped = match_to_our_id(result, our_matches)
            if match_id is None:
                print(f"  ⚠️  No match ID found for: {result['team1']} vs {result['team2']}")
                skipped += 1
                continue

            s1 = result["score2"] if swapped else result["score1"]
            s2 = result["score1"] if swapped else result["score2"]

            try:
                db.table("actual_scores").upsert(
                    {"match_id": match_id, "score1": s1, "score2": s2},
                    on_conflict="match_id"
                ).execute()
                print(f"  ✅ Match {match_id}: {result['team1']} {s1}–{s2} {result['team2']} saved")
                updated += 1
            except Exception as e:
                print(f"  ❌ Supabase error for match {match_id}: {e}")
                skipped += 1

    print(f"\nDone — {updated} scores saved, {skipped} skipped.")

if __name__ == "__main__":
    run()
