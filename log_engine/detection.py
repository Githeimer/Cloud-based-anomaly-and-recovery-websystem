'''
Stage 1 of the detection -> classification pipeline.

Runs on a 60s/10s SLIDING window (window=60s, step=10s):
  - Scheduler fires every 10s (STEP_SECONDS).
  - Each cycle queries the last 60s of request_logs (WINDOW_SECONDS).
  - Each row appears in up to 6 consecutive windows (deliberate —
    sustained attacks accumulate negative scores across windows).

Per cycle, per source_ip:
  1. Skip IPs with no new activity in the last STEP_SECONDS (active-IP optimisation).
  2. Aggregate 12 features from that IP's rows in the window.
  3. Run Isolation Forest decision_function() -> raw anomaly score.
       score >  NORMAL_THRESHOLD   : healthy, reset counters.
       score <  ANOMALY_THRESHOLD  : hard anomaly, cascade to classifier.
       score in between (dead zone): accumulate strikes; flag after DEADZONE_STRIKES.
  4. Anomalous IPs:
       a. Dedup check — skip if same IP fired within DEDUP_COOLDOWN_SECONDS.
       b. Write anomaly_events row.
       c. Cascade to classifier -> get final threat label.
       d. Update anomaly_events with final label.
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
WINDOW_SECONDS = 60
STEP_SECONDS   = 10

# ── decision_function() thresholds ───────────────────────────────────────────
ANOMALY_THRESHOLD = -0.05   # below this -> hard anomaly
NORMAL_THRESHOLD  =  0.05   # above this -> healthy

# ── Dead-zone accumulation ────────────────────────────────────────────────────
DEADZONE_STRIKES = 2
_deadzone_counter: dict[str, int] = {}   # source_ip -> consecutive strike count

# ── Deduplication guard ───────────────────────────────────────────────────────
# Same source_ip cannot fire a new anomaly_events row within this cooldown.
# Prevents duplicate rows from overlapping windows for the same attack burst.
DEDUP_COOLDOWN_SECONDS = 60
_recently_flagged: dict[str, datetime] = {}   # source_ip -> last fired time

# ── Feature order — confirmed against trained IF model ────────────────────────
# Do NOT reorder without re-checking model.feature_names_in_.
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

KNOWN_ENDPOINTS = [
    "/api/auth/login", "/api/auth/register", "/api/auth/logout",
    "/api/auth/refresh", "/api/user/profile", "/api/dashboard",
    "/api/posts", "/api/posts/create", "/api/health", "/api/health/db",
    "/api/metrics", "/api/recovery/trigger", "/api/recovery/status",
    "/api/admin/users",
]
TOTAL_KNOWN_ENDPOINTS = len(KNOWN_ENDPOINTS)

try:
    print("Loading Isolation Forest model...")
    _if_pkg = joblib.load(IF_MODEL_PATH)
    if isinstance(_if_pkg, dict):
        _if_model  = _if_pkg["model"]
        _if_scaler = _if_pkg.get("scaler")
    else:
        _if_model  = _if_pkg
        _if_scaler = None
    print("Isolation Forest model loaded.\n")
except FileNotFoundError:
    raise RuntimeError(f"IF model not found at: {IF_MODEL_PATH}") from None


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _window_bounds(now=None):
    now   = now or datetime.now(timezone.utc)
    end   = now.replace(microsecond=0)
    start = end - timedelta(seconds=WINDOW_SECONDS)
    return start, end


async def fetch_window_logs(start, end):
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
    """
    Aggregate one IP's raw rows into the 12 IF feature vector.
    Returns (feature_dict, np.ndarray shape (1,12)).
    feature_dict is also passed to model_inference.infer() for CLF features.
    """
    n              = len(ip_rows)
    response_times = [r["response_time_ms"]  or 0 for r in ip_rows]
    request_sizes  = [r["request_size_bytes"] or 0 for r in ip_rows]
    db_times       = [r["db_query_time_ms"]   or 0 for r in ip_rows]
    status_codes   = [r["status_code"]        or 0 for r in ip_rows]

    failed_login_attempts = sum(
        1 for r in ip_rows
        if r["endpoint"] and "login" in r["endpoint"]
        and r["status_code"] in (401, 403)
    )
    refresh_token_calls  = sum(
        1 for r in ip_rows
        if r["endpoint"] and "refresh" in r["endpoint"]
    )
    error_count          = sum(1 for s in status_codes if s >= 400)
    unique_endpoints_hit = len({r["endpoint"] for r in ip_rows if r["endpoint"]})

    feature_dict = {
        "response_time_ms":            statistics.mean(response_times) if response_times else 0.0,
        "request_size_bytes":          statistics.mean(request_sizes)  if request_sizes  else 0.0,
        "requests_per_minute_from_ip": float(n),
        "failed_login_attempts":       float(failed_login_attempts),
        "refresh_token_calls_per_min": float(refresh_token_calls),
        "db_query_latency_ms":         statistics.mean(db_times) if db_times else 0.0,
        "cpu_usage_percent":           0.0,   # not in DB schema — hardcoded per project decision
        "status_family":               statistics.mean([s // 100 for s in status_codes]) if status_codes else 0.0,
        "is_error":                    (error_count / n) if n else 0.0,
        "endpoint_risk_score":         (unique_endpoints_hit / TOTAL_KNOWN_ENDPOINTS) if TOTAL_KNOWN_ENDPOINTS else 0.0,
        "db_latency_spike":            statistics.pstdev(db_times) if len(db_times) > 1 else 0.0,
        "auth_failure_ratio":          (failed_login_attempts / n) if n else 0.0,
    }

    vector = np.array(
        [feature_dict[f] for f in IF_FEATURES], dtype=float
    ).reshape(1, -1)
    return feature_dict, vector


# ─────────────────────────────────────────────────────────────────────────────
# DB writes
# ─────────────────────────────────────────────────────────────────────────────

async def _write_anomaly_event(source_ip, confidence_score, related_log_ids):
    async with database.pool.acquire() as conn:
        row = await conn.fetchrow("""
            INSERT INTO anomaly_events
                (anomaly_type, source_ip, confidence_score, related_log_ids)
            VALUES ('UNCLASSIFIED', $1, $2, $3)
            RETURNING id
        """, source_ip, confidence_score, related_log_ids)
    return row["id"]


async def _update_anomaly_label(event_id, labels):
    """Majority-vote the per-row classifier labels, update DB, return final label."""
    if not labels:
        return "UNCLASSIFIED"
    final_label = max(set(labels), key=labels.count)
    async with database.pool.acquire() as conn:
        await conn.execute("""
            UPDATE anomaly_events SET anomaly_type = $1 WHERE id = $2
        """, final_label, event_id)
    return final_label


# ─────────────────────────────────────────────────────────────────────────────
# Anomaly handler
# ─────────────────────────────────────────────────────────────────────────────

async def _handle_anomaly(source_ip, score, ip_rows, reason, feature_dict):
    """
    Called when IF flags a window as anomalous.
    Steps:
      1. Dedup check — suppress if same IP fired within cooldown.
      2. Write anomaly_events row (UNCLASSIFIED).
      3. Run classifier -> majority-vote label.
      4. Update anomaly_events.anomaly_type with final label.
    """
    # ── Dedup guard ───────────────────────────────────────────────────────────
    now        = datetime.now(timezone.utc)
    last_fired = _recently_flagged.get(source_ip)
    if last_fired and (now - last_fired).total_seconds() < DEDUP_COOLDOWN_SECONDS:
        print(f"  [{source_ip}] SUPPRESSED (dedup cooldown)  score={score:.4f}")
        return
    _recently_flagged[source_ip] = now

    # ── Write event ───────────────────────────────────────────────────────────
    related_log_ids = [r["id"] for r in ip_rows]
    event_id        = await _write_anomaly_event(source_ip, score, related_log_ids)

    # ── Classify ──────────────────────────────────────────────────────────────
    labels      = model_inference.infer([feature_dict], [ip_rows])
    final_label = await _update_anomaly_label(event_id, labels)

    print(f"  [{source_ip}] ANOMALY ({reason})  score={score:.4f}  "
          f"n={len(ip_rows)}  label={final_label}  event_id={event_id}")


# ─────────────────────────────────────────────────────────────────────────────
# Main detection cycle — called by scheduler every STEP_SECONDS
# ─────────────────────────────────────────────────────────────────────────────

async def run_detection_cycle():
    """
    decision_function() score interpretation:
      score >  NORMAL_THRESHOLD  (+0.05) -> healthy
      score <  ANOMALY_THRESHOLD (-0.05) -> hard anomaly, cascade immediately
      score in [-0.05, +0.05]            -> dead zone, accumulate strikes;
                                            flag after DEADZONE_STRIKES hits
    """
    try:
        now           = datetime.now(timezone.utc)
        start, end    = _window_bounds(now)
        recent_cutoff = end - timedelta(seconds=STEP_SECONDS)

        rows = await fetch_window_logs(start, end)
        if not rows:
            print(f"[DETECTION] No logs in window {start} -> {end}, skipping.")
            return

        # Active-IP optimisation: only run IF on IPs with new rows this step
        active_ips = {
            r["source_ip"] for r in rows
            if r["timestamp"] and r["timestamp"] >= recent_cutoff
        }

        grouped = _group_by_ip(rows)
        print(f"\n{'='*70}")
        print(f"  Detection cycle  {start} -> {end}  "
              f"({len(grouped)} IP(s), {len(active_ips)} active)")
        print(f"{'='*70}")

        for source_ip, ip_rows in grouped.items():

            # Skip IPs with no new activity this step
            if source_ip not in active_ips:
                continue

            feature_dict, vector = _build_window_features(ip_rows)
            X     = _if_scaler.transform(vector) if _if_scaler is not None else vector
            score = float(_if_model.decision_function(X)[0])

            # ── Healthy ───────────────────────────────────────────────────────
            if score > NORMAL_THRESHOLD:
                _deadzone_counter.pop(source_ip, None)
                _recently_flagged.pop(source_ip, None)  # reset cooldown on recovery
                print(f"  [{source_ip}] HEALTHY   score={score:.4f}  n={len(ip_rows)}")
                continue

            # ── Hard anomaly ──────────────────────────────────────────────────
            if score < ANOMALY_THRESHOLD:
                _deadzone_counter.pop(source_ip, None)
                await _handle_anomaly(source_ip, score, ip_rows,
                                      reason="hard", feature_dict=feature_dict)
                continue

            # ── Dead zone ─────────────────────────────────────────────────────
            strikes = _deadzone_counter.get(source_ip, 0) + 1
            _deadzone_counter[source_ip] = strikes
            print(f"  [{source_ip}] DEADZONE  score={score:.4f}  "
                  f"strikes={strikes}/{DEADZONE_STRIKES}  n={len(ip_rows)}")

            if strikes >= DEADZONE_STRIKES:
                _deadzone_counter.pop(source_ip, None)
                await _handle_anomaly(source_ip, score, ip_rows,
                                      reason="deadzone", feature_dict=feature_dict)

        print(f"{'='*70}")

    except Exception as e:
        print(f"[DETECTION] Error: {e}")    