'''
Stage 1 of the detection -> classification pipeline.

Runs on a 30s/10s SLIDING window (window=30s, step=10s):
  - Scheduler fires every 10s.
  - Each cycle queries the last 30s of request_logs.
  - Each log row appears in up to 3 consecutive windows (deliberate —
    sustained attacks accumulate negative scores across windows, which
    feeds the dead-zone accumulation logic below).

Per cycle, per source_ip:
  1. Aggregate 12 features from that IP's rows in the window.
  2. Run Isolation Forest decision_function() -> raw anomaly score.
       score >  NORMAL_THRESHOLD   : healthy, skip.
       score <  ANOMALY_THRESHOLD  : anomalous, cascade immediately.
       score in between (dead zone): accumulate across windows;
                                     flag after DEADZONE_STRIKES consecutive hits.
  3. Anomalous IPs -> write anomaly_events row -> classifier for threat label.

NOTE: cpu_usage_percent is hardcoded to 0.0 because request_logs has no
column for it yet. This was an explicit decision and matches the same
workaround already used in model_inference.py.

IMPORTANT: This sliding window setup requires the IF model to have been
trained on 30s windows. The current deployed model was trained on 60s
windows — swap it before enabling this in production.
'''

import os
import statistics
from datetime import datetime, timedelta, timezone

import joblib
import numpy as np
import warnings

import database
import model_inference

warnings.filterwarnings("ignore")

IF_MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "..", "ml", "models", "detection",
    "isolation_forest_model.joblib"
)

# ── Window configuration ──────────────────────────────────────────────────────
WINDOW_SECONDS = 60    # how far back each cycle looks (must match IF training)
STEP_SECONDS   = 10    # scheduler fires every STEP_SECONDS (set in main.py)

# ── decision_function() thresholds ────────────────────────────────────────────
# Scores below ANOMALY_THRESHOLD  -> hard anomaly, cascade immediately.
# Scores above NORMAL_THRESHOLD   -> healthy, skip.
# Scores in between               -> dead zone, accumulate strikes.
ANOMALY_THRESHOLD = -0.05   # clearly anomalous
NORMAL_THRESHOLD  =  0.05   # clearly normal

# ── Dead-zone accumulation ────────────────────────────────────────────────────
# If an IP stays in the dead zone for this many consecutive cycles, treat as
# anomalous. Catches low-and-slow attacks that deliberately sit near the
# IF boundary. Cleared when the IP scores clearly normal.
DEADZONE_STRIKES  = 2
_deadzone_counter: dict[str, int] = {}   # source_ip -> consecutive strike count

# ── Exact feature order confirmed against the trained IF model ────────────────
# Do not reorder without re-confirming against model.feature_names_in_.
IF_FEATURES = [
    "response_time_ms",
    "request_size_bytes",
    "requests_per_minute_from_ip",
    "failed_login_attempts",
    "refresh_token_calls_per_min",
    "db_query_latency_ms",
    "cpu_usage_percent",
    "status_family",
    "is_error",
    "endpoint_risk_score",
    "db_latency_spike",
    "auth_failure_ratio",
]

# Used for endpoint_risk_score = unique_endpoints_hit / total_known_endpoints.
# Update this list if new endpoints are added to the system.
KNOWN_ENDPOINTS = [
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/logout",
    "/api/auth/refresh",
    "/api/user/profile",
    "/api/dashboard",
    "/api/posts",
    "/api/posts/create",
    "/api/health",
    "/api/health/db",
    "/api/metrics",
    "/api/recovery/trigger",
    "/api/recovery/status",
    "/api/admin/users",
]
TOTAL_KNOWN_ENDPOINTS = len(KNOWN_ENDPOINTS)

try:
    print("Loading Isolation Forest model...")
    _if_pkg = joblib.load(IF_MODEL_PATH)
    # Support either a bare estimator or a {"model": ..., "scaler": ...} package,
    # matching the dict-wrapped pattern model_inference.py already uses.
    if isinstance(_if_pkg, dict):
        _if_model = _if_pkg["model"]
        _if_scaler = _if_pkg.get("scaler")
    else:
        _if_model = _if_pkg
        _if_scaler = None
    print("Isolation Forest model loaded.\n")
except FileNotFoundError:
    raise RuntimeError(f"Isolation Forest model file not found at: {IF_MODEL_PATH}") from None


def _window_bounds(now=None):
    """Return (start, end) for the current sliding window.
    End = now (truncated to millisecond), start = end - WINDOW_SECONDS.
    Unlike the old tumbling window, this does NOT align to minute boundaries —
    it simply looks back WINDOW_SECONDS from the moment the scheduler fires."""
    now = now or datetime.now(timezone.utc)
    end = now.replace(microsecond=0)
    start = end - timedelta(seconds=WINDOW_SECONDS)
    return start, end


async def fetch_window_logs(start, end):
    """Fetch all raw log rows in [start, end) for the window."""
    async with database.pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT
                id, timestamp, request_id, source_ip, user_agent,
                method, endpoint, status_code, error_code,
                response_time_ms, request_size_bytes, response_size_bytes,
                user_id, is_authenticated, db_query_time_ms,
                db_error, db_error_code, ingested_at
            FROM request_logs
            WHERE timestamp >= $1 AND timestamp < $2
            ORDER BY source_ip, timestamp ASC
        """, start, end)
    return [dict(r) for r in rows]


def _group_by_ip(rows):
    grouped = {}
    for r in rows:
        grouped.setdefault(r["source_ip"], []).append(r)
    return grouped


def _build_window_features(ip_rows):
    """Aggregate one IP's raw rows in the window into the 12 IF features.
    Returns (feature_dict, np.array in IF_FEATURES order)."""
    n = len(ip_rows)

    response_times = [r["response_time_ms"] or 0 for r in ip_rows]
    request_sizes = [r["request_size_bytes"] or 0 for r in ip_rows]
    db_times = [r["db_query_time_ms"] or 0 for r in ip_rows]
    status_codes = [r["status_code"] or 0 for r in ip_rows]

    failed_login_attempts = sum(
        1 for r in ip_rows
        if r["endpoint"] and "login" in r["endpoint"]
        and r["status_code"] in (401, 403)
    )
    refresh_token_calls = sum(
        1 for r in ip_rows
        if r["endpoint"] and "refresh" in r["endpoint"]
    )
    error_count = sum(1 for s in status_codes if s >= 400)

    unique_endpoints_hit = len({r["endpoint"] for r in ip_rows if r["endpoint"]})

    feature_dict = {
        "response_time_ms": statistics.mean(response_times) if response_times else 0.0,
        "request_size_bytes": statistics.mean(request_sizes) if request_sizes else 0.0,
        "requests_per_minute_from_ip": float(n),
        "failed_login_attempts": float(failed_login_attempts),
        "refresh_token_calls_per_min": float(refresh_token_calls),
        "db_query_latency_ms": statistics.mean(db_times) if db_times else 0.0,
        "cpu_usage_percent": 0.0,  # not collected yet, hardcoded per project decision
        "status_family": statistics.mean([s // 100 for s in status_codes]) if status_codes else 0.0,
        "is_error": (error_count / n) if n else 0.0,
        "endpoint_risk_score": (unique_endpoints_hit / TOTAL_KNOWN_ENDPOINTS) if TOTAL_KNOWN_ENDPOINTS else 0.0,
        "db_latency_spike": statistics.pstdev(db_times) if len(db_times) > 1 else 0.0,
        "auth_failure_ratio": (failed_login_attempts / n) if n else 0.0,
    }

    vector = np.array([feature_dict[f] for f in IF_FEATURES], dtype=float).reshape(1, -1)
    return feature_dict, vector


async def write_anomaly_event(source_ip, confidence_score, related_log_ids, anomaly_type="UNCLASSIFIED"):
    async with database.pool.acquire() as conn:
        row = await conn.fetchrow("""
            INSERT INTO anomaly_events (anomaly_type, source_ip, confidence_score, related_log_ids)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        """, anomaly_type, source_ip, confidence_score, related_log_ids)
    return row["id"]


async def update_anomaly_event_labels(event_id, labels):
    """Store the classifier's per-row labels for this anomaly event.
    Uses the most frequent label as the event's final anomaly_type."""
    if not labels:
        return
    final_label = max(set(labels), key=labels.count)
    async with database.pool.acquire() as conn:
        await conn.execute("""
            UPDATE anomaly_events SET anomaly_type = $1 WHERE id = $2
        """, final_label, event_id)


def _row_to_classifier_tuple(row):
    """model_inference._build_features expects the same column order
    watch_logs.fetch_latest produces. Reproduce that tuple shape here."""
    return (
        row["id"], row["timestamp"], row["request_id"], row["source_ip"], row["user_agent"],
        row["method"], row["endpoint"], row["status_code"], row["error_code"],
        row["response_time_ms"], row["request_size_bytes"], row["response_size_bytes"],
        row["user_id"], row["is_authenticated"], row["db_query_time_ms"],
        row["db_error"], row["db_error_code"], row["ingested_at"],
    )


async def _handle_anomaly(source_ip, score, ip_rows, reason):
    """Shared handler: write anomaly_events row, cascade to classifier."""
    related_log_ids = [r["id"] for r in ip_rows]
    event_id = await write_anomaly_event(source_ip, score, related_log_ids)

    classifier_input = [_row_to_classifier_tuple(r) for r in ip_rows]
    labels = model_inference.infer(classifier_input)
    await update_anomaly_event_labels(event_id, labels)

    final_label = max(set(labels), key=labels.count) if labels else "UNCLASSIFIED"
    print(f"  [{source_ip}] ANOMALY ({reason})  score={score:.4f}  "
          f"n={len(ip_rows)}  label={final_label}  event_id={event_id}")


async def run_detection_cycle():
    """Entry point called by the scheduler every STEP_SECONDS (10s).

    decision_function() score interpretation:
      score >  NORMAL_THRESHOLD  ( 0.05) -> healthy
      score <  ANOMALY_THRESHOLD (-0.05) -> hard anomaly, cascade immediately
      score in [-0.05, 0.05]             -> dead zone, accumulate strikes;
                                            after DEADZONE_STRIKES hits -> anomaly
    """
    try:
        start, end = _window_bounds()
        rows = await fetch_window_logs(start, end)

        if not rows:
            print(f"[DETECTION] No logs in window {start} -> {end}, skipping.")
            return

        grouped = _group_by_ip(rows)
        print(f"\n{'='*70}")
        print(f"  Detection cycle  window={start} -> {end}  "
              f"step={STEP_SECONDS}s  ({len(grouped)} IP(s))")
        print(f"{'='*70}")

        for source_ip, ip_rows in grouped.items():
            _, vector = _build_window_features(ip_rows)

            X = vector
            if _if_scaler is not None:
                X = _if_scaler.transform(X)

            # Use decision_function() for continuous score, not hard predict()
            score = float(_if_model.decision_function(X)[0])

            # ── Clearly normal ───────────────────────────────────────────────
            if score > NORMAL_THRESHOLD:
                _deadzone_counter.pop(source_ip, None)   # reset any accumulated strikes
                print(f"  [{source_ip}] HEALTHY   score={score:.4f}  n={len(ip_rows)}")
                continue

            # ── Hard anomaly — cascade immediately ───────────────────────────
            if score < ANOMALY_THRESHOLD:
                _deadzone_counter.pop(source_ip, None)   # reset; hard flag takes over
                await _handle_anomaly(source_ip, score, ip_rows, reason="hard")
                continue

            # ── Dead zone: accumulate strikes ────────────────────────────────
            strikes = _deadzone_counter.get(source_ip, 0) + 1
            _deadzone_counter[source_ip] = strikes
            print(f"  [{source_ip}] DEADZONE  score={score:.4f}  "
                  f"strikes={strikes}/{DEADZONE_STRIKES}  n={len(ip_rows)}")

            if strikes >= DEADZONE_STRIKES:
                _deadzone_counter.pop(source_ip, None)   # reset after firing
                await _handle_anomaly(source_ip, score, ip_rows, reason="deadzone")

        print(f"{'='*70}")

    except Exception as e:
        print(f"[DETECTION] Error: {e}")