"""
Compare post-P0 checkpoint vs baseline checkpoint_committed_20260416_174047.json.
Prints per-provider deltas, per-skill deltas (focused on the 4 originally-flagged skills),
and verdict counts. Reads the LATEST checkpoint_committed_*.json that's newer than the baseline.
"""
import json, glob, os
from pathlib import Path
from collections import defaultdict

HERE = Path(__file__).parent
RESULTS = HERE / "results"
BASELINE_PATH = RESULTS / "checkpoint_committed_20260416_174047.json"

FLAGGED_SKILLS = [
    "starknet/starknet-js",
    "starknet/starknet-defi",
    "protocols/uniswap-v3-integration",
    "sui/docs-move-programmability",
]
FIXED_QIDS = {"STARKNET-Q27","STARKNET-Q32","STARKNET-Q36","STARKNET-Q39","STARKNET-Q44"}
DROPPED_QIDS = {"Q1005","Q1006","Q1008","Q1014","Q1053","Q1054"}


def latest_other_checkpoint() -> Path:
    cands = sorted(
        [Path(p) for p in glob.glob(str(RESULTS / "checkpoint_committed_*.json"))],
        key=lambda p: p.stat().st_mtime,
    )
    cands = [p for p in cands if p.name != BASELINE_PATH.name]
    if not cands:
        raise SystemExit("no newer checkpoint found")
    return cands[-1]


def stats(rows):
    by_p = defaultdict(list)
    for r in rows:
        by_p[r.get("provider","?")].append(r)
    out = {}
    for p, rs in by_p.items():
        n = len(rs)
        avg_c = sum(r["control_score"] for r in rs)/n
        avg_t = sum(r["test_score"] for r in rs)/n
        verdicts = defaultdict(int)
        for r in rs:
            verdicts[r.get("verdict","?")] += 1
        out[p] = {
            "n": n,
            "ctrl_avg": avg_c,
            "test_avg": avg_t,
            "delta": avg_t - avg_c,
            "pass": verdicts.get("pass",0),
            "partial": verdicts.get("partial",0),
            "fail": verdicts.get("fail",0),
        }
    return out


def per_skill_delta(rows):
    by_skill = defaultdict(list)
    for r in rows:
        by_skill[r.get("skill_id","?")].append(r)
    out = {}
    for sid, rs in by_skill.items():
        n = len(rs)
        delta_sum = sum(r["test_score"]-r["control_score"] for r in rs)
        out[sid] = {"n": n, "delta_sum": delta_sum, "delta_avg": delta_sum/n}
    return out


def main():
    baseline = json.loads(BASELINE_PATH.read_text())
    new_path = latest_other_checkpoint()
    new = json.loads(new_path.read_text())

    print(f"baseline: {BASELINE_PATH.name} ({len(baseline['rows'])} rows)")
    print(f"new:      {new_path.name} ({len(new['rows'])} rows)")
    print()

    bs, ns = stats(baseline["rows"]), stats(new["rows"])
    print("=== Per-provider averages ===")
    print(f"{'provider':<32} {'n':>5} {'ctrl':>6} {'test':>6} {'Δ':>7}  vs baseline (Δctrl/Δtest/Δgap)")
    for p in sorted(set(list(bs.keys()) + list(ns.keys()))):
        b = bs.get(p, {"n":0,"ctrl_avg":0,"test_avg":0,"delta":0})
        n = ns.get(p, {"n":0,"ctrl_avg":0,"test_avg":0,"delta":0})
        print(f"{p:<32} {n['n']:>5} {n['ctrl_avg']:>6.2f} {n['test_avg']:>6.2f} {n['delta']:>+7.2f}  "
              f"(Δctrl={n['ctrl_avg']-b['ctrl_avg']:+.2f} Δtest={n['test_avg']-b['test_avg']:+.2f} Δgap={n['delta']-b['delta']:+.2f})")

    print("\n=== Verdict counts ===")
    for p in sorted(set(list(bs.keys()) + list(ns.keys()))):
        b = bs.get(p, {})
        n = ns.get(p, {})
        print(f"  {p}")
        print(f"    baseline: pass={b.get('pass',0)} partial={b.get('partial',0)} fail={b.get('fail',0)}")
        print(f"    new:      pass={n.get('pass',0)} partial={n.get('partial',0)} fail={n.get('fail',0)}")

    print("\n=== Flagged skills (delta_sum: positive = skill helps) ===")
    bsk = per_skill_delta(baseline["rows"])
    nsk = per_skill_delta(new["rows"])
    print(f"{'skill':<45} {'n_old':>5} {'Δ_old':>7} {'n_new':>5} {'Δ_new':>7} {'shift':>7}")
    for sid in FLAGGED_SKILLS:
        b = bsk.get(sid, {"n":0,"delta_sum":0})
        n = nsk.get(sid, {"n":0,"delta_sum":0})
        shift = n["delta_sum"] - b["delta_sum"]
        print(f"{sid:<45} {b['n']:>5} {b['delta_sum']:>+7.0f} {n['n']:>5} {n['delta_sum']:>+7.0f} {shift:>+7.0f}")

    # Specific question outcomes for the 5 fixed STARKNET questions
    print("\n=== Fixed STARKNET questions — new outcomes ===")
    by_qid = defaultdict(list)
    for r in new["rows"]:
        if r["question_id"] in FIXED_QIDS:
            by_qid[r["question_id"]].append(r)
    for qid in sorted(FIXED_QIDS):
        rows = by_qid.get(qid, [])
        for r in rows:
            d = r["test_score"] - r["control_score"]
            print(f"  {qid} | {r['provider']:<32} ctrl={r['control_score']} test={r['test_score']} Δ={d:+d} verdict={r.get('verdict')}")

    # Baseline outcomes for the dropped questions
    print("\n=== Dropped Q1xxx — baseline outcomes (for record) ===")
    for r in baseline["rows"]:
        if r["question_id"] in DROPPED_QIDS:
            d = r["test_score"] - r["control_score"]
            print(f"  {r['question_id']} | {r['provider']:<32} ctrl={r['control_score']} test={r['test_score']} Δ={d:+d}")


if __name__ == "__main__":
    main()
