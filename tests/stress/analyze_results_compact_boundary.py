#!/usr/bin/env python3
"""
Ashley Chang Le Xuan, A0252633J
Analyze JMeter results for the compact boundary sweep (30-160 users).

Purpose:
- quickly tell whether each stage is functioning at all
- summarize flow-level and payment-level latency
- classify failure mode as hard vs graceful
- identify the highest healthy stage under configurable thresholds

Usage:
  run the stress test with JMeter, saving results to a CSV file (e.g. results/checkout_stress_compact_boundary.csv), then run this script to analyze the results:
  python analyze_results_compact_boundary.py results/checkout_stress_compact_boundary.csv \
      --error-threshold 0.05 --p95-threshold-ms 5000
"""

from __future__ import annotations

import argparse
import csv
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

STAGES = [
    ("Stage 0 - Smoke - 1 users", 1),
    ("Stage 1 - 30 users", 30),
    ("Stage 2 - 60 users", 60),
    ("Stage 3 - 90 users", 90),
    ("Stage 4 - 110 users", 110),
    ("Stage 5 - 120 users", 120),
    ("Stage 6 - 130 users", 130),
    ("Stage 7 - 140 users", 140),
    ("Stage 8 - 150 users", 150),
    ("Stage 9 - 160 users", 160),
]

FLOW_LABEL = "Checkout Flow"
PAYMENT_LABEL = "Checkout - Payment and Order Creation"


@dataclass
class StageSummary:
    stage: str
    users: int
    flows: int
    flow_error_rate: float
    flow_p50_ms: float
    flow_p95_ms: float
    payment_p50_ms: float
    payment_p95_ms: float
    completed_flows_per_sec: float
    hard_failures: int
    graceful_failures: int


def percentile(values: list[int], p: int) -> float:
    if not values:
        return float("nan")
    data = sorted(values)
    k = (len(data) - 1) * p / 100
    f = int(k)
    c = min(f + 1, len(data) - 1)
    if f == c:
        return float(data[f])
    return data[f] + (data[c] - data[f]) * (k - f)


def classify_failure(row: dict[str, str]) -> str:
    success = row.get("success", "true").lower() == "true"
    if success:
        return "ok"
    try:
        code = int(row.get("responseCode", "0") or "0")
    except ValueError:
        code = 0
    if code in {409, 429, 503}:
        return "graceful"
    if code == 0 or code >= 500:
        return "hard"
    return "graceful"


def load_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def assign_stage(thread_name: str) -> tuple[str, int] | None:
    for stage, users in STAGES:
        if stage in thread_name:
            return stage, users
    return None


def summarize(rows: list[dict[str, str]]) -> list[StageSummary]:
    grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        match = assign_stage(row.get("threadName", ""))
        if match:
            grouped[match[0]].append(row)

    results: list[StageSummary] = []
    for stage, users in STAGES:
        stage_rows = grouped.get(stage, [])
        if not stage_rows:
            continue

        flow_rows = [r for r in stage_rows if r.get("label") == FLOW_LABEL]
        payment_rows = [r for r in stage_rows if r.get("label") == PAYMENT_LABEL]
        if not flow_rows:
            continue

        flow_elapsed = [int(r["elapsed"]) for r in flow_rows if r.get("elapsed", "").isdigit()]
        payment_elapsed = [int(r["elapsed"]) for r in payment_rows if r.get("elapsed", "").isdigit()]
        flow_failures = [r for r in flow_rows if r.get("success", "true").lower() != "true"]

        stamps = [int(r["timeStamp"]) for r in flow_rows if r.get("timeStamp", "").isdigit()]
        if len(stamps) >= 2 and max(stamps) > min(stamps):
            cps = len(flow_rows) / ((max(stamps) - min(stamps)) / 1000)
        else:
            cps = 0.0

        hard = sum(1 for r in flow_rows if classify_failure(r) == "hard")
        graceful = sum(1 for r in flow_rows if classify_failure(r) == "graceful")

        results.append(
            StageSummary(
                stage=stage,
                users=users,
                flows=len(flow_rows),
                flow_error_rate=len(flow_failures) / len(flow_rows),
                flow_p50_ms=percentile(flow_elapsed, 50),
                flow_p95_ms=percentile(flow_elapsed, 95),
                payment_p50_ms=percentile(payment_elapsed, 50),
                payment_p95_ms=percentile(payment_elapsed, 95),
                completed_flows_per_sec=cps,
                hard_failures=hard,
                graceful_failures=graceful,
            )
        )
    return results


def health_label(s: StageSummary, error_threshold: float, p95_threshold_ms: float) -> str:
    if s.flow_error_rate >= error_threshold:
        return "BROKEN"
    if s.flow_p95_ms >= p95_threshold_ms:
        return "DEGRADED"
    return "HEALTHY"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("results_csv", nargs="?", default="results/checkout_stress_compact_boundary.csv")
    ap.add_argument("--error-threshold", type=float, default=0.05)
    ap.add_argument("--p95-threshold-ms", type=float, default=5000.0)
    args = ap.parse_args()

    path = Path(args.results_csv)
    if not path.exists():
        raise SystemExit(f"Results file not found: {path}")

    rows = load_rows(path)
    summaries = summarize(rows)
    if not summaries:
        raise SystemExit("No matching stage data found in CSV.")

    print(f"Loaded {len(rows):,} rows from {path}")
    print()
    print("=" * 140)
    print("COMPACT BOUNDARY SWEEP REPORT (30 / 60 / 90 / 110-160 USERS)")
    print(f"Error threshold: {args.error_threshold:.1%} | p95 threshold: {args.p95_threshold_ms:.0f} ms")
    print("=" * 140)
    print(f"{'Stage':<26} {'Users':>5} {'Health':>10} {'Flows':>8} {'Flow/s':>8} {'ErrRate':>8} {'Flow p50':>10} {'Flow p95':>10} {'Pay p50':>10} {'Pay p95':>10} {'Hard':>7} {'Grace':>7}")
    print("-" * 140)

    healthy_max = None
    for s in summaries:
        health = health_label(s, args.error_threshold, args.p95_threshold_ms)
        if health == "HEALTHY":
            healthy_max = s
        print(f"{s.stage:<26} {s.users:>5} {health:>10} {s.flows:>8,} {s.completed_flows_per_sec:>7.2f} {s.flow_error_rate:>7.1%} {s.flow_p50_ms:>9.0f}ms {s.flow_p95_ms:>9.0f}ms {s.payment_p50_ms:>9.0f}ms {s.payment_p95_ms:>9.0f}ms {s.hard_failures:>7} {s.graceful_failures:>7}")

    print("=" * 140)
    if healthy_max:
        print(f"Highest healthy stage: {healthy_max.stage} ({healthy_max.users} users)")
    else:
        print("Highest healthy stage: none")

    broken = [s for s in summaries if health_label(s, args.error_threshold, args.p95_threshold_ms) == "BROKEN"]
    degraded = [s for s in summaries if health_label(s, args.error_threshold, args.p95_threshold_ms) == "DEGRADED"]

    if broken:
        first = broken[0]
        print(f"First broken stage: {first.stage} ({first.users} users) with {first.flow_error_rate:.1%} flow errors")
    else:
        print("First broken stage: none")

    if degraded:
        first = degraded[0]
        print(f"First degraded stage: {first.stage} ({first.users} users) with flow p95 {first.flow_p95_ms:.0f} ms")
    else:
        print("First degraded stage: none")

    print()
    print("Payment p95 trend:")
    for s in summaries:
        bars = "#" * min(int(s.payment_p95_ms / 100), 60)
        print(f"  {s.stage:<26} {bars:<60} {s.payment_p95_ms:>7.0f} ms")


if __name__ == "__main__":
    main()
