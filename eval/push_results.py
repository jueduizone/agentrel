#!/usr/bin/env python3
"""
push_results.py — Upload eval results JSON to Supabase eval_runs + eval_results tables
Usage: python3 eval/push_results.py eval/results/2026-03-30-1638.json [--label v2.0-50q]
"""
import argparse, json, os, sys
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
    "Prefer": "return=representation",
}


def post(path, data):
    r = requests.post(f"{SUPABASE_URL}/rest/v1/{path}", json=data, headers=HEADERS, timeout=15)
    r.raise_for_status()
    return r.json()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("results_file")
    parser.add_argument("--label", default="")
    parser.add_argument("--notes", default="")
    args = parser.parse_args()

    with open(args.results_file) as f:
        data = json.load(f)

    run_date = data.get("timestamp", "")[:10] or "2026-01-01"

    # Insert run
    run_payload = {
        "run_date": run_date,
        "judge_model": data.get("judge_model", "gpt-4o-mini").split("+")[-1].strip(),
        "inject_mode": "slice" if "slice" in args.results_file else "full",
        "total_questions": data["total_questions"],
        "avg_control": data["avg_control"],
        "avg_test": data["avg_test"],
        "label": args.label or None,
        "notes": args.notes or None,
    }
    print(f"Inserting run: {run_payload['run_date']} / {run_payload['total_questions']}q …")
    run_resp = post("eval_runs", run_payload)
    run_id = run_resp[0]["id"]
    print(f"  → run_id: {run_id}")

    # Insert results
    result_rows = []
    for r in data["results"]:
        result_rows.append({
            "run_id": run_id,
            "question_id": r["id"],
            "category": r["category"],
            "skill_id": r["skill_id"],
            "skill_found": r.get("skill_found", True),
            "control_score": r["control_score"],
            "test_score": r["test_score"],
            "faithfulness": r.get("faithfulness"),
        })

    # Batch insert (max 1000 per request)
    batch_size = 200
    for i in range(0, len(result_rows), batch_size):
        batch = result_rows[i:i+batch_size]
        post("eval_results", batch)
        print(f"  Inserted rows {i+1}–{i+len(batch)}")

    print(f"\n✅ Done. Run {run_id} saved with {len(result_rows)} results.")
    print(f"   View at: https://agentrel.vercel.app/benchmark")


if __name__ == "__main__":
    main()
