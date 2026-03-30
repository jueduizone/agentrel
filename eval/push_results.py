#!/usr/bin/env python3
"""
push_results.py — Upload eval results JSON to Supabase eval_results table
Usage:
  python3 eval/push_results.py eval/results/2026-03-30-1638.json  # single file
  python3 eval/push_results.py --all                               # import all JSONs
"""
import argparse, json, os, sys
from pathlib import Path
import requests

SUPABASE_URL = "https://zkpeutvzmrfhlzpsbyhr.supabase.co"
SERVICE_KEY = os.environ.get(
    "SUPABASE_SERVICE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprcGV1dHZ6bXJmaGx6cHNieWhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjk1MTI0MSwiZXhwIjoyMDg4NTI3MjQxfQ.DtvWVp2SrwNrfR503XjPUiW_H_T4GRrHqCTnjMZb9hI"
)
HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}
RESULTS_DIR = Path(__file__).parent / "results"


def push_file(path: str, dry_run: bool = False) -> int:
    """Push a single results JSON. Returns number of rows inserted."""
    with open(path) as f:
        data = json.load(f)

    run_at = data.get("timestamp") or data.get("run_at", "2026-01-01T00:00:00Z")
    judge_model = data.get("judge_model", "gpt-4o-mini").split("+")[-1].strip()
    inject_strategy = "slice" if "slice" in str(path) else data.get("inject_mode", "full")

    rows = []
    for r in data.get("results", []):
        rows.append({
            "run_at": run_at,
            "judge_model": judge_model,
            "inject_strategy": inject_strategy,
            "category": r.get("category", ""),
            "question_id": r.get("id", ""),
            "question_label": r.get("label", r.get("id", "")),
            "control_score": r.get("control_score"),
            "test_score": r.get("test_score"),
            "faithfulness": r.get("faithfulness"),
            "skill_id": r.get("skill_id", ""),
            "skill_found": r.get("skill_found", True),
        })

    if not rows:
        print(f"  [skip] {path}: no results")
        return 0

    if dry_run:
        print(f"  [dry] {path}: would insert {len(rows)} rows (run_at={run_at[:19]})")
        return len(rows)

    # Batch insert
    batch_size = 200
    inserted = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i+batch_size]
        r = requests.post(f"{SUPABASE_URL}/rest/v1/eval_results",
                          json=batch, headers=HEADERS, timeout=15)
        if r.ok:
            inserted += len(batch)
        else:
            print(f"  [error] {r.status_code}: {r.text[:100]}")
            return inserted

    print(f"  ✅ {path}: inserted {inserted} rows")
    return inserted


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("file", nargs="?", help="Single results JSON file to upload")
    parser.add_argument("--all", action="store_true", help="Import all JSONs from eval/results/")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if args.all:
        files = sorted(RESULTS_DIR.glob("*.json"))
        print(f"Importing {len(files)} files from {RESULTS_DIR}...")
        total = 0
        for f in files:
            total += push_file(str(f), dry_run=args.dry_run)
        print(f"\nTotal: {total} rows {'(dry-run)' if args.dry_run else 'inserted'}")
    elif args.file:
        push_file(args.file, dry_run=args.dry_run)
    else:
        parser.print_help()
        sys.exit(1)

    print(f"\nView at: https://agentrel.vercel.app/benchmark")


if __name__ == "__main__":
    main()
