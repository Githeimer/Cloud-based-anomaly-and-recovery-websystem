"""
Synthetic Log Generator — Detection Dataset (Unlabelled)
----------------------------------------------------------
Generates 10,000 synthetic logs for the anomaly DETECTION stage.

Composition:
    8,000  Healthy
    2,000  Anomalies, split across:
             - DDoS            (500)
             - Brute Force     (500)
             - Refresh Abuse   (500)
             - DB Failure      (500)

IMPORTANT: This dataset is UNLABELLED on purpose (no 'label' column),
since the detection model is meant to learn/operate on normal-vs-anomalous
patterns without being handed the ground-truth class. An internal
'_true_class' column is included only for your own reference/debugging
and can be dropped before training (see DROP_TRUE_CLASS flag below).

Output: detection_dataset_10k.jsonl  (one JSON object per line)
"""

import json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SEED = 42
N_HEALTHY = 8000
N_ANOMALY_PER_TYPE = 500   # 4 types * 500 = 2000 anomalies
DROP_TRUE_CLASS = False    # set True to fully strip the reference column
OUTPUT_PATH = "detection_dataset_10k.jsonl"

rng = np.random.default_rng(SEED)

START_TIME = datetime(2025, 1, 1, 0, 0, 0)

ENDPOINTS = [
    "/api/login", "/api/logout", "/api/users", "/api/orders",
    "/api/products", "/api/auth/refresh", "/api/payments",
    "/api/dashboard", "/api/search", "/api/notifications"
]

HTTP_METHODS = ["GET", "POST", "PUT", "DELETE"]


def random_ip(rng):
    return f"{rng.integers(1, 255)}.{rng.integers(0, 255)}.{rng.integers(0, 255)}.{rng.integers(1, 255)}"


def make_timestamps(n, start, rng, spread_minutes=60 * 24 * 7):
    """Spread timestamps randomly across a 7-day window, then sort."""
    offsets = rng.integers(0, spread_minutes * 60, size=n)  # seconds
    timestamps = [start + timedelta(seconds=int(o)) for o in offsets]
    return sorted(timestamps)


# ---------------------------------------------------------------------------
# Class generators — each returns a DataFrame of rows for that class
# ---------------------------------------------------------------------------

def gen_healthy(n, rng):
    timestamps = make_timestamps(n, START_TIME, rng)
    df = pd.DataFrame({
        "timestamp": timestamps,
        "source_ip": [random_ip(rng) for _ in range(n)],
        "endpoint": rng.choice(ENDPOINTS, size=n),
        "http_method": rng.choice(HTTP_METHODS, size=n, p=[0.55, 0.30, 0.10, 0.05]),
        "status_code": rng.choice([200, 201, 204, 301, 304], size=n,
                                   p=[0.80, 0.08, 0.06, 0.03, 0.03]),
        "response_time_ms": rng.normal(120, 35, size=n).clip(10, 400),
        "request_size_bytes": rng.normal(800, 200, size=n).clip(50, 3000),
        "requests_per_minute_from_ip": rng.normal(3, 1.5, size=n).clip(1, 12),
        "failed_login_attempts": rng.choice([0, 1], size=n, p=[0.97, 0.03]),
        "refresh_token_calls_per_min": rng.normal(0.3, 0.3, size=n).clip(0, 2),
        "db_query_latency_ms": rng.normal(15, 6, size=n).clip(2, 60),
        "db_connection_errors": np.zeros(n, dtype=int),
        "cpu_usage_percent": rng.normal(35, 10, size=n).clip(5, 70),
    })
    df["_true_class"] = "healthy"
    return df


def gen_ddos(n, rng):
    timestamps = make_timestamps(n, START_TIME, rng)
    df = pd.DataFrame({
        "timestamp": timestamps,
        "source_ip": [random_ip(rng) for _ in range(n)],
        "endpoint": rng.choice(ENDPOINTS, size=n),
        "http_method": rng.choice(HTTP_METHODS, size=n, p=[0.85, 0.10, 0.03, 0.02]),
        "status_code": rng.choice([200, 429, 503, 504], size=n,
                                   p=[0.20, 0.40, 0.25, 0.15]),
        "response_time_ms": rng.normal(800, 250, size=n).clip(200, 3000),
        "request_size_bytes": rng.normal(300, 100, size=n).clip(20, 1000),
        "requests_per_minute_from_ip": rng.normal(250, 80, size=n).clip(80, 600),
        "failed_login_attempts": rng.choice([0, 1, 2], size=n, p=[0.85, 0.10, 0.05]),
        "refresh_token_calls_per_min": rng.normal(1, 1, size=n).clip(0, 5),
        "db_query_latency_ms": rng.normal(60, 25, size=n).clip(10, 200),
        "db_connection_errors": rng.poisson(0.5, size=n),
        "cpu_usage_percent": rng.normal(88, 8, size=n).clip(60, 100),
    })
    df["_true_class"] = "ddos"
    return df


def gen_brute_force(n, rng):
    timestamps = make_timestamps(n, START_TIME, rng)
    df = pd.DataFrame({
        "timestamp": timestamps,
        "source_ip": [random_ip(rng) for _ in range(n)],
        "endpoint": ["/api/login"] * n,
        "http_method": ["POST"] * n,
        "status_code": rng.choice([401, 403, 200], size=n, p=[0.75, 0.15, 0.10]),
        "response_time_ms": rng.normal(180, 50, size=n).clip(40, 500),
        "request_size_bytes": rng.normal(250, 60, size=n).clip(50, 600),
        "requests_per_minute_from_ip": rng.normal(40, 15, size=n).clip(10, 120),
        "failed_login_attempts": rng.integers(5, 50, size=n),
        "refresh_token_calls_per_min": rng.normal(0.2, 0.2, size=n).clip(0, 1),
        "db_query_latency_ms": rng.normal(20, 8, size=n).clip(5, 70),
        "db_connection_errors": np.zeros(n, dtype=int),
        "cpu_usage_percent": rng.normal(50, 12, size=n).clip(20, 85),
    })
    df["_true_class"] = "brute_force"
    return df


def gen_refresh_abuse(n, rng):
    timestamps = make_timestamps(n, START_TIME, rng)
    df = pd.DataFrame({
        "timestamp": timestamps,
        "source_ip": [random_ip(rng) for _ in range(n)],
        "endpoint": ["/api/auth/refresh"] * n,
        "http_method": ["POST"] * n,
        "status_code": rng.choice([200, 429, 401], size=n, p=[0.40, 0.45, 0.15]),
        "response_time_ms": rng.normal(150, 45, size=n).clip(30, 450),
        "request_size_bytes": rng.normal(200, 50, size=n).clip(40, 500),
        "requests_per_minute_from_ip": rng.normal(60, 20, size=n).clip(15, 150),
        "failed_login_attempts": rng.choice([0, 1], size=n, p=[0.9, 0.1]),
        "refresh_token_calls_per_min": rng.normal(35, 12, size=n).clip(10, 100),
        "db_query_latency_ms": rng.normal(18, 7, size=n).clip(3, 60),
        "db_connection_errors": np.zeros(n, dtype=int),
        "cpu_usage_percent": rng.normal(55, 13, size=n).clip(25, 90),
    })
    df["_true_class"] = "refresh_abuse"
    return df


def gen_db_failure(n, rng):
    timestamps = make_timestamps(n, START_TIME, rng)
    df = pd.DataFrame({
        "timestamp": timestamps,
        "source_ip": [random_ip(rng) for _ in range(n)],
        "endpoint": rng.choice(ENDPOINTS, size=n),
        "http_method": rng.choice(HTTP_METHODS, size=n, p=[0.5, 0.3, 0.1, 0.1]),
        "status_code": rng.choice([500, 502, 503, 200], size=n,
                                   p=[0.40, 0.25, 0.20, 0.15]),
        "response_time_ms": rng.normal(2500, 800, size=n).clip(500, 6000),
        "request_size_bytes": rng.normal(700, 200, size=n).clip(50, 2500),
        "requests_per_minute_from_ip": rng.normal(5, 2, size=n).clip(1, 15),
        "failed_login_attempts": rng.choice([0, 1], size=n, p=[0.95, 0.05]),
        "refresh_token_calls_per_min": rng.normal(0.4, 0.3, size=n).clip(0, 2),
        "db_query_latency_ms": rng.normal(900, 300, size=n).clip(150, 3000),
        "db_connection_errors": rng.poisson(4, size=n),
        "cpu_usage_percent": rng.normal(70, 15, size=n).clip(30, 100),
    })
    df["_true_class"] = "db_failure"
    return df


# ---------------------------------------------------------------------------
# Build dataset
# ---------------------------------------------------------------------------

def main():
    healthy_df = gen_healthy(N_HEALTHY, rng)
    ddos_df = gen_ddos(N_ANOMALY_PER_TYPE, rng)
    brute_df = gen_brute_force(N_ANOMALY_PER_TYPE, rng)
    refresh_df = gen_refresh_abuse(N_ANOMALY_PER_TYPE, rng)
    dbfail_df = gen_db_failure(N_ANOMALY_PER_TYPE, rng)

    full_df = pd.concat(
        [healthy_df, ddos_df, brute_df, refresh_df, dbfail_df],
        ignore_index=True
    )

    # Shuffle rows so classes aren't grouped together
    full_df = full_df.sample(frac=1, random_state=SEED).reset_index(drop=True)

    # Round numeric columns for readability
    numeric_cols = [
        "response_time_ms", "request_size_bytes", "requests_per_minute_from_ip",
        "refresh_token_calls_per_min", "db_query_latency_ms", "cpu_usage_percent"
    ]
    full_df[numeric_cols] = full_df[numeric_cols].round(2)

    if DROP_TRUE_CLASS:
        full_df = full_df.drop(columns=["_true_class"])

    # Convert timestamp to ISO 8601 string for clean JSON serialization
    full_df["timestamp"] = full_df["timestamp"].apply(
        lambda ts: ts.isoformat() if isinstance(ts, datetime) else ts
    )

    # Write one JSON object per line (JSONL)
    with open(OUTPUT_PATH, "w") as f:
        for record in full_df.to_dict(orient="records"):
            f.write(json.dumps(record) + "\n")

    # Summary
    print(f"Saved {len(full_df)} rows to {OUTPUT_PATH}")
    print("\nClass distribution (reference only — not used by detection model):")
    print(full_df["_true_class"].value_counts() if "_true_class" in full_df.columns
          else "  (dropped, dataset is fully unlabelled)")


if __name__ == "__main__":
    main()
