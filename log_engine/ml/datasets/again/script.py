"""
Window-Aware Realistic Synthetic Log Generator (FIXED)
=======================================================
Generates logs that respect your detection pipeline's sliding window:
  - window_size = 60 seconds
  - step        = 10 seconds

CHANGED from the original version:
  1. requests_per_minute_from_ip, failed_login_attempts, and
     refresh_token_calls_per_min are no longer left for engineer_features()
     to default to 0 — they're computed here as REAL rolling 60s counts
     per source_ip, via add_window_aggregates(). This was the reason every
     class showed 0.0 for these columns and zero variance across the board.
  2. BRUTE_FORCE_IPS and REFRESH_ABUSE_IPS no longer share an IP
     (103.129.134.139 was in both lists, both starting bursts at t=0 —
     that would have blended the two classes' counts together the moment
     rolling aggregates were computed).

Output:
  brute_force_5k_windowed.jsonl
  refresh_abuse_5k_windowed.jsonl
  healthy_interleaved_2k.jsonl  (baseline healthy logs for contrast)
"""

import json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta, timezone

SEED = 42
rng = np.random.default_rng(SEED)

BASE_TIME = datetime(2026, 7, 7, 15, 0, 0, tzinfo=timezone.utc)

# Attack IPs — realistic pool, not just one machine.
# CHANGED: no more shared IP between brute_force and refresh_abuse.
BRUTE_FORCE_IPS = [
    "::ffff:103.129.134.139",
    "::ffff:45.33.32.156",
    "::ffff:198.51.100.22",
    "::ffff:203.0.113.45",
    "::ffff:192.0.2.188",
]

REFRESH_ABUSE_IPS = [
    "::ffff:172.16.254.1",   # CHANGED: was 103.129.134.139 (shared with brute_force)
    "::ffff:10.0.0.254",
    "::ffff:185.220.101.45",
    "::ffff:91.108.4.200",
    "::ffff:77.88.55.88",
    "::ffff:64.62.250.15",   # CHANGED: added to keep 6 IPs after removing the shared one
]

HEALTHY_IPS = [
    "::ffff:82.45.120.33",
    "::ffff:156.24.88.11",
    "::ffff:99.203.4.17",
    "::ffff:221.10.55.3",
    "::ffff:37.228.209.1",
]

ENDPOINTS = ["/api/records", "/api/users", "/api/assets", "/api/dashboard", "/api/auth/login"]


def fmt_ts(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "+00:00"


def write_jsonl(records, path):
    with open(path, "w") as f:
        for r in records:
            f.write(json.dumps(r) + "\n")
    print(f"Saved {len(records)} records → {path}")


# ---------------------------------------------------------------------------
# NEW: Real windowed aggregation
# Computes requests_per_minute_from_ip, failed_login_attempts, and
# refresh_token_calls_per_min as true rolling 60s counts per source_ip,
# using a two-pointer sliding window (O(n) per IP, not O(n^2)).
# ---------------------------------------------------------------------------
def add_window_aggregates(records, window_seconds=60):
    df = pd.DataFrame(records)
    df["_ts"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values(["source_ip", "_ts"]).reset_index(drop=True)

    rpm = np.zeros(len(df))
    fla = np.zeros(len(df))
    rtc = np.zeros(len(df))

    is_failed_login = ((df["endpoint"] == "/api/auth/login") & (df["status_code"] == 400)).to_numpy()
    is_refresh_call  = (df["endpoint"] == "/api/records").to_numpy()  # refresh_abuse hits this endpoint
    times = df["_ts"].to_numpy()

    for ip, grp in df.groupby("source_ip", sort=False):
        idx = grp.index.to_numpy()
        n = len(idx)
        j = 0
        window = np.timedelta64(window_seconds, "s")
        for i in range(n):
            # advance the left pointer past events older than (t_i - window)
            while times[idx[j]] < times[idx[i]] - window:
                j += 1
            count = i - j + 1
            rpm[idx[i]] = count                                  # requests in trailing 60s == per-minute rate
            fla[idx[i]] = is_failed_login[idx[j:i + 1]].sum()
            rtc[idx[i]] = is_refresh_call[idx[j:i + 1]].sum()

    df["requests_per_minute_from_ip"] = rpm
    df["failed_login_attempts"]       = fla
    df["refresh_token_calls_per_min"] = rtc

    df = df.sort_values("_ts").drop(columns=["_ts"]).reset_index(drop=True)
    return df.to_dict(orient="records")


# ---------------------------------------------------------------------------
# Attack episode generator
# Creates a dense burst of logs within a 60s window for one IP
# ---------------------------------------------------------------------------
def attack_burst(start_dt, ip, n_requests, log_fn):
    """Generate n_requests logs within a 60s window starting at start_dt."""
    offsets = sorted(rng.uniform(0, 59, size=n_requests))
    logs = []
    for offset in offsets:
        dt = start_dt + timedelta(seconds=float(offset))
        logs.append(log_fn(dt, ip))
    return logs


# ---------------------------------------------------------------------------
# Brute Force log factory
# POST /api/auth/login → 400, 46-53 bytes, 0-51ms
# ---------------------------------------------------------------------------
def brute_force_log(dt, ip):
    if rng.random() < 0.90:
        rt = int(rng.integers(0, 6))
    else:
        rt = int(rng.integers(30, 52))

    return {
        "timestamp": fmt_ts(dt),
        "source_ip": ip,
        "user_agent": "ApacheBench/2.3",
        "method": "POST",
        "endpoint": "/api/auth/login",
        "status_code": 400,
        "error_code": "AUTH_FAILED",
        "response_time_ms": rt,
        "request_size_bytes": int(rng.choice([46, 47, 48, 49, 50, 51, 52, 53],
                                              p=[0.05, 0.08, 0.15, 0.18, 0.15, 0.13, 0.12, 0.14])),
        "response_size_bytes": 30,
        "user_id": None,
        "is_authenticated": False,
        "db_query_time_ms": None,
        "db_error": False,
        "db_error_code": None,
        "_true_class": "brute_force"
    }


# ---------------------------------------------------------------------------
# Refresh Abuse log factory
# GET /api/records → 200, 0 bytes, 1-73ms (bimodal)
# ---------------------------------------------------------------------------
def refresh_abuse_log(dt, ip, progress=0.5):
    if progress < 0.05:
        rt = int(rng.integers(40, 74))
    elif progress < 0.15:
        rt = int(rng.integers(15, 40))
    else:
        rt = int(rng.integers(1, 11))

    return {
        "timestamp": fmt_ts(dt),
        "source_ip": ip,
        "user_agent": "Grafana k6/2.0.0",
        "method": "GET",
        "endpoint": "/api/records",
        "status_code": 200,
        "error_code": None,
        "response_time_ms": rt,
        "request_size_bytes": 0,
        "response_size_bytes": int(rng.integers(800, 1200)),
        "user_id": str(rng.integers(1, 10)),
        "is_authenticated": True,
        "db_query_time_ms": max(0, rt - 1),
        "db_error": False,
        "db_error_code": None,
        "_true_class": "refresh_abuse"
    }


# ---------------------------------------------------------------------------
# Healthy log factory
# Normal varied traffic across endpoints
# ---------------------------------------------------------------------------
def healthy_log(dt, ip):
    endpoint = rng.choice(ENDPOINTS, p=[0.25, 0.20, 0.15, 0.20, 0.20])
    status = int(rng.choice([200, 201, 304], p=[0.80, 0.10, 0.10]))
    rt = int(rng.normal(120, 35))
    rt = max(10, min(rt, 400))

    return {
        "timestamp": fmt_ts(dt),
        "source_ip": ip,
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "method": str(rng.choice(["GET", "POST"], p=[0.65, 0.35])),
        "endpoint": str(endpoint),
        "status_code": status,
        "error_code": None,
        "response_time_ms": rt,
        "request_size_bytes": int(rng.normal(800, 200)),
        "response_size_bytes": int(rng.normal(1200, 300)),
        "user_id": str(rng.integers(1, 20)),
        "is_authenticated": True,
        "db_query_time_ms": max(0, rt - int(rng.integers(10, 50))),
        "db_error": False,
        "db_error_code": None,
        "_true_class": "healthy"
    }


# ---------------------------------------------------------------------------
# Main generation
# Strategy:
#   - 30 minute window (BASE_TIME to BASE_TIME + 30min)
#   - Attack episodes: one per IP, staggered every ~3-4 minutes
#   - Each episode = 1-3 dense attack bursts (60s each) per IP
#   - Healthy logs fill the gaps between attack episodes
# ---------------------------------------------------------------------------
def gen_brute_force(target=5000):
    all_logs = []
    logs_per_ip = target // len(BRUTE_FORCE_IPS)

    for idx, ip in enumerate(BRUTE_FORCE_IPS):
        ip_start = BASE_TIME + timedelta(minutes=idx * 4)
        remaining = logs_per_ip
        burst_start = ip_start

        while remaining > 0:
            burst_size = min(remaining, int(rng.integers(80, 201)))
            burst_logs = attack_burst(burst_start, ip, burst_size, brute_force_log)
            all_logs.extend(burst_logs)
            remaining -= burst_size
            burst_start = burst_start + timedelta(seconds=float(rng.integers(10, 31)))

    return all_logs[:target]  # NOTE: shuffle happens after aggregation now, not here


def gen_refresh_abuse(target=5000):
    all_logs = []
    logs_per_ip = target // len(REFRESH_ABUSE_IPS)

    for idx, ip in enumerate(REFRESH_ABUSE_IPS):
        ip_start = BASE_TIME + timedelta(minutes=idx * 3)
        remaining = logs_per_ip
        burst_start = ip_start
        burst_count = 0

        while remaining > 0:
            burst_size = min(remaining, int(rng.integers(50, 151)))
            offsets = sorted(rng.uniform(0, 59, size=burst_size))
            for i, offset in enumerate(offsets):
                dt = burst_start + timedelta(seconds=float(offset))
                p = (burst_count * burst_size + i) / logs_per_ip
                all_logs.append(refresh_abuse_log(dt, ip, progress=p))

            remaining -= burst_size
            burst_count += 1
            burst_start = burst_start + timedelta(seconds=float(rng.integers(10, 25)))

    return all_logs[:target]


def gen_healthy(target=2000):
    all_logs = []
    logs_per_ip = target // len(HEALTHY_IPS)

    for idx, ip in enumerate(HEALTHY_IPS):
        offsets = sorted(rng.uniform(0, 1800, size=logs_per_ip))
        for offset in offsets:
            dt = BASE_TIME + timedelta(seconds=float(offset))
            all_logs.append(healthy_log(dt, ip))

    return all_logs[:target]


if __name__ == "__main__":
    print("Generating brute force logs...")
    bf = gen_brute_force(5000)

    print("Generating refresh abuse logs...")
    ra = gen_refresh_abuse(5000)

    print("Generating healthy interleaved logs...")
    hl = gen_healthy(2000)

    # CHANGED: compute real rolling-window aggregates per class BEFORE shuffling
    # (order doesn't matter for the two-pointer scan since it re-sorts internally,
    # but doing it per-class keeps this simple and keeps each class's own IPs isolated)
    print("Computing windowed aggregates (requests/min, failed logins, refresh calls)...")
    bf = add_window_aggregates(bf)
    ra = add_window_aggregates(ra)
    hl = add_window_aggregates(hl)

    # shuffle now, after aggregation
    rng.shuffle(bf)
    rng.shuffle(ra)
    rng.shuffle(hl)

    write_jsonl(bf, "brute_force_5k_windowed.jsonl")
    write_jsonl(ra, "refresh_abuse_5k_windowed.jsonl")
    write_jsonl(hl, "healthy_interleaved_2k.jsonl")

    # Quick sanity check: confirm the aggregate columns actually vary now
    print("\n--- Sanity check: aggregate columns are no longer flat 0 ---")
    for name, logs in [("brute_force", bf), ("refresh_abuse", ra), ("healthy", hl)]:
        rpm = [r["requests_per_minute_from_ip"] for r in logs]
        fla = [r["failed_login_attempts"] for r in logs]
        rtc = [r["refresh_token_calls_per_min"] for r in logs]
        print(f"  {name:<15} requests_per_minute_from_ip: min={min(rpm)} avg={sum(rpm)/len(rpm):.1f} max={max(rpm)}  "
              f"failed_login_attempts: max={max(fla)}  refresh_token_calls_per_min: max={max(rtc)}")