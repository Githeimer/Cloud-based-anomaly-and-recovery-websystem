"""
=============================================================================
  Adaptive Cloud-Based Disaster Recovery System
  Synthetic Log Generator  —  v2.1
=============================================================================
  Fix from v2.0:
    - All scenarios now share the SAME base timestamp
    - Combined log sorted by timestamp (realistic concurrent traffic)
    - Attacker IPs remain distinct from legitimate IPs so per-IP
      windowing in the feature extractor stays clean

  Scenarios:
    HEALTHY        — normal authenticated web traffic
    BRUTE_FORCE    — repeated AUTH_FAILED on /api/auth/login from few IPs
    REFRESH_ABUSE  — high-frequency token refresh (authenticated)
    DDOS           — volumetric flood across all endpoints from botnet IPs

  Outputs:
    logs_healthy.jsonl
    logs_brute_force.jsonl
    logs_refresh_abuse.jsonl
    logs_ddos.jsonl
    logs_combined.jsonl   ← all scenarios merged, sorted by timestamp
=============================================================================
"""

import json
import random
import uuid
from datetime import datetime, timedelta, timezone

import numpy as np

# ── Seed ─────────────────────────────────────────────────────────────────────
SEED = 42
random.seed(SEED)
np.random.seed(SEED)

# ── Volume ────────────────────────────────────────────────────────────────────
N_HEALTHY       = 7_000
N_BRUTE_FORCE   = 1_000
N_REFRESH_ABUSE = 1_000
N_DDOS          = 1_000
TRANSITION_RATIO = 0.15

# ALL scenarios share the same base time — this is the v2.1 fix
START_TIME = datetime(2025, 4, 27, 10, 0, 0, tzinfo=timezone.utc)

# ── IP / UA pools ─────────────────────────────────────────────────────────────
LEGITIMATE_IPS = [
    "203.0.113.42", "198.51.100.17", "192.0.2.88",
    "203.0.113.5",  "198.51.100.99", "192.0.2.14",
    "203.0.113.77", "198.51.100.34", "192.0.2.201",
    "203.0.113.60", "198.51.100.55", "192.0.2.77",
    "203.0.113.11", "198.51.100.88", "192.0.2.33",
    "203.0.113.99", "198.51.100.21", "192.0.2.150",
    "203.0.113.44", "198.51.100.63",
]
BROWSER_UAS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/Safari",
    "axios/1.6.8",
]
ATTACKER_IPS_BRUTE   = ["45.33.32.156",   "185.220.101.47", "194.165.16.78"]
ATTACKER_IPS_REFRESH = ["103.21.244.10",  "185.107.56.201"]
ATTACKER_IPS_DDOS    = ["172.31.10.5",    "172.31.10.18",   "172.31.10.44",
                         "172.31.10.77",   "172.31.10.99"]
SCRIPT_UAS = [
    "python-requests/2.31.0", "Go-http-client/1.1",
    "curl/8.1.2",             "libwww-perl/6.72", "Hydra/9.5",
]
USER_IDS    = [f"usr_{i}" for i in range(800, 920)]
PROCESS_IDS = ["pm2-worker-0", "pm2-worker-1", "pm2-worker-2", "pm2-worker-3"]

# ── Endpoints ─────────────────────────────────────────────────────────────────
ENDPOINTS = [
    ("/api/auth/login",     "POST",   True,  18),
    ("/api/auth/register",  "POST",   True,   6),
    ("/api/auth/logout",    "POST",   False,  8),
    ("/api/auth/refresh",   "POST",   False, 10),
    ("/api/models",         "GET",    True,  14),
    ("/api/models",         "POST",   True,   5),
    ("/api/models/{id}",    "GET",    True,  10),
    ("/api/models/{id}",    "PUT",    True,   4),
    ("/api/models/{id}",    "DELETE", True,   2),
    ("/api/assets",         "GET",    True,  10),
    ("/api/assets",         "POST",   True,   4),
    ("/api/assets/{id}",    "GET",    True,   6),
    ("/api/user/profile",   "GET",    True,   8),
    ("/api/user/profile",   "PUT",    True,   3),
    ("/api/health",         "GET",    False,  5),
    ("/api/status",         "GET",    False,  4),
    ("/api/system/metrics", "GET",    False,  3),
]
_EP_W    = [e[3] for e in ENDPOINTS]
_EP_NORM = [w / sum(_EP_W) for w in _EP_W]

def pick_endpoint():
    return random.choices(ENDPOINTS, weights=_EP_NORM, k=1)[0]

def resolve(ep):
    return ep.replace("{id}", str(random.randint(1000, 9999)))

# ── Noise ─────────────────────────────────────────────────────────────────────
def jitter(value, pct=0.08, floor=0.0):
    return max(floor, value + np.random.normal(0, abs(value) * pct))

def jitter_int(value, pct=0.08, floor=0):
    return max(floor, int(round(jitter(float(value), pct, float(floor)))))

# ── Base entry ────────────────────────────────────────────────────────────────
def base_entry(ts, source_ip, user_agent, user_id):
    return {
        "timestamp":          ts.strftime("%Y-%m-%dT%H:%M:%S.")
                              + f"{ts.microsecond // 1000:03d}Z",
        "request_id":         str(uuid.uuid4()),
        "source_ip":          source_ip,
        "user_agent":         user_agent,
        "user_id":            user_id,
        "process_id":         random.choice(PROCESS_IDS),
        "request_size_bytes": random.randint(64, 512),
    }

# ── Scenario builders ─────────────────────────────────────────────────────────
def build_healthy(ts):
    ep_def = pick_endpoint()
    endpoint, method, touches_db, _ = ep_def
    endpoint   = resolve(endpoint)
    source_ip  = random.choice(LEGITIMATE_IPS)
    user_agent = random.choice(BROWSER_UAS)
    user_id    = random.choice(USER_IDS)

    entry = base_entry(ts, source_ip, user_agent, user_id)
    entry["method"]   = method
    entry["endpoint"] = endpoint

    db_q = jitter_int(random.randint(20, 120), pct=0.10) if touches_db else 0

    roll = random.random()
    if   roll < 0.025: status, error_code, is_auth = 401, "AUTH_FAILED",      False
    elif roll < 0.030: status, error_code, is_auth = 404, "NOT_FOUND",         False
    elif roll < 0.033: status, error_code, is_auth = 422, "VALIDATION_ERROR",  False
    else:              status, error_code, is_auth = (200 if method != "POST" else 201), None, True

    overhead      = random.randint(5, 40)
    response_time = jitter_int(db_q + overhead if touches_db else random.randint(2, 20))

    entry.update({
        "status_code":         status,
        "error_code":          error_code,
        "response_time_ms":    response_time,
        "response_size_bytes": random.randint(60, 800),
        "is_authenticated":    is_auth,
        "db_query_time_ms":    db_q,
        "db_error":            False,
        "db_error_code":       None,
        "cpu_percent":         round(jitter(random.uniform(10.0, 35.0), pct=0.08), 1),
        "memory_mb":           jitter_int(random.randint(280, 380), pct=0.05),
        "scenario":            "HEALTHY",
    })
    return entry


def build_brute_force(ts, intensity=1.0):
    source_ip  = random.choice(ATTACKER_IPS_BRUTE)
    user_agent = random.choice(SCRIPT_UAS) if random.random() < intensity else random.choice(BROWSER_UAS)
    user_id    = random.choice(USER_IDS)

    entry = base_entry(ts, source_ip, user_agent, user_id)
    entry["method"]   = "POST"
    entry["endpoint"] = "/api/auth/login"

    if random.random() < (1.0 - intensity) * 0.3:
        status, error_code, is_auth = 200, None, True
    else:
        status, error_code, is_auth = 401, "AUTH_FAILED", False

    db_q          = jitter_int(random.randint(15, 60), pct=0.10)
    response_time = jitter_int(db_q + random.randint(5, 25), pct=0.10)

    entry.update({
        "status_code":         status,
        "error_code":          error_code,
        "response_time_ms":    response_time,
        "response_size_bytes": random.randint(60, 150),
        "is_authenticated":    is_auth,
        "db_query_time_ms":    db_q,
        "db_error":            False,
        "db_error_code":       None,
        "cpu_percent":         round(jitter(random.uniform(12.0, 38.0), pct=0.08), 1),
        "memory_mb":           jitter_int(random.randint(280, 390), pct=0.05),
        "scenario":            "BRUTE_FORCE",
    })
    return entry


def build_refresh_abuse(ts, intensity=1.0):
    source_ip  = random.choice(ATTACKER_IPS_REFRESH)
    user_agent = random.choice(SCRIPT_UAS) if random.random() < intensity else random.choice(BROWSER_UAS)
    user_id    = random.choice(USER_IDS)

    entry = base_entry(ts, source_ip, user_agent, user_id)
    entry["method"]   = "POST"
    entry["endpoint"] = "/api/auth/refresh"

    if intensity > 0.7 and random.random() < 0.35:
        status, error_code, is_auth = 429, "RATE_LIMITED", True
    else:
        status, error_code, is_auth = 200, None, True

    entry.update({
        "status_code":         status,
        "error_code":          error_code,
        "response_time_ms":    jitter_int(random.randint(5, 30), pct=0.10),
        "response_size_bytes": random.randint(80, 200),
        "is_authenticated":    is_auth,
        "db_query_time_ms":    0,
        "db_error":            False,
        "db_error_code":       None,
        "cpu_percent":         round(jitter(random.uniform(15.0, 45.0), pct=0.08), 1),
        "memory_mb":           jitter_int(random.randint(290, 400), pct=0.05),
        "scenario":            "REFRESH_ABUSE",
    })
    return entry


def build_ddos(ts, intensity=1.0):
    source_ip  = random.choice(ATTACKER_IPS_DDOS)
    user_agent = random.choice(SCRIPT_UAS + BROWSER_UAS)
    user_id    = random.choice(USER_IDS) if random.random() < 0.3 else "anonymous"
    ep_def     = pick_endpoint()
    endpoint, method, _, _ = ep_def
    endpoint   = resolve(endpoint)

    entry = base_entry(ts, source_ip, user_agent, user_id)
    entry["method"]   = method
    entry["endpoint"] = endpoint

    roll = random.random()
    if intensity > 0.5 and roll < 0.50:
        status, error_code, is_auth = 429, "RATE_LIMITED",     False
    elif intensity > 0.7 and roll < 0.65:
        status, error_code, is_auth = 503, "SERVICE_DEGRADED", False
    elif roll < 0.10:
        status, error_code, is_auth = 200, None,               True
    else:
        status, error_code, is_auth = 429, "RATE_LIMITED",     False

    response_time = jitter_int(
        max(2, int(random.randint(5, 30) * (1.0 - intensity * 0.7))), pct=0.10, floor=2
    )
    cpu_base = 40.0 + (intensity * 45.0)
    mem_base = 350  + int(intensity * 200)

    entry.update({
        "status_code":         status,
        "error_code":          error_code,
        "response_time_ms":    response_time,
        "response_size_bytes": random.randint(50, 200),
        "is_authenticated":    is_auth,
        "db_query_time_ms":    0,
        "db_error":            False,
        "db_error_code":       None,
        "cpu_percent":         round(jitter(cpu_base, pct=0.08), 1),
        "memory_mb":           jitter_int(mem_base, pct=0.05),
        "scenario":            "DDOS",
    })
    return entry

# ── Generators ────────────────────────────────────────────────────────────────
def generate_healthy(n, ts_start):
    logs = []
    ts   = ts_start
    for _ in range(n):
        entry = build_healthy(ts)
        entry["phase"] = "full"
        logs.append(entry)
        ts += timedelta(seconds=random.randint(1, 5),
                        milliseconds=random.randint(0, 999))
    return logs


def with_transition(builder_fn, n_full, ts_start, time_step_range=(1, 3)):
    n_trans = max(1, int(n_full * TRANSITION_RATIO))
    logs = []
    ts   = ts_start

    for _ in range(n_trans):
        entry = builder_fn(ts, intensity=random.uniform(0.30, 0.50))
        entry["phase"] = "transition"
        logs.append(entry)
        ts += timedelta(seconds=random.randint(*time_step_range),
                        milliseconds=random.randint(0, 999))

    for _ in range(n_full):
        entry = builder_fn(ts, intensity=1.0)
        entry["phase"] = "full"
        logs.append(entry)
        ts += timedelta(seconds=random.randint(*time_step_range),
                        milliseconds=random.randint(0, 999))
    return logs

# ── IO ────────────────────────────────────────────────────────────────────────
def write_jsonl(logs, path):
    with open(path, "w", encoding="utf-8") as f:
        for entry in logs:
            f.write(json.dumps(entry) + "\n")
    print(f"  [✓] {path:<38} {len(logs):>6,} rows")

def summarize(logs, label):
    total    = len(logs)
    errors   = sum(1 for l in logs if l["status_code"] >= 400)
    auth_f   = sum(1 for l in logs if l.get("error_code") == "AUTH_FAILED")
    rate_lim = sum(1 for l in logs if l.get("error_code") == "RATE_LIMITED")
    avg_resp = sum(l["response_time_ms"] for l in logs) / total
    avg_cpu  = sum(l["cpu_percent"] for l in logs) / total
    ts_list  = sorted(l["timestamp"] for l in logs)
    print(f"\n  ── {label}")
    print(f"     Rows            : {total:,}")
    print(f"     HTTP 4xx/5xx    : {errors:,}  ({errors/total*100:.1f}%)")
    print(f"     AUTH_FAILED     : {auth_f:,}")
    print(f"     RATE_LIMITED    : {rate_lim:,}")
    print(f"     Avg response_ms : {avg_resp:.0f} ms")
    print(f"     Avg cpu%%        : {avg_cpu:.1f}%%")
    print(f"     Time range      : {ts_list[0]}  →  {ts_list[-1]}")

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print(f"\n{'='*62}")
    print(f"  Synthetic Log Generator  —  DR System  v2.1")
    print(f"{'='*62}\n")

    # v2.1 KEY CHANGE: all scenarios start at the SAME base time
    # Attacker IPs are distinct from legit IPs → per-IP windowing stays clean
    # Combined log sorted by timestamp → realistic concurrent traffic stream
    print("Generating …")
    healthy_logs = generate_healthy(N_HEALTHY, START_TIME)
    brute_logs   = with_transition(build_brute_force,   N_BRUTE_FORCE,
                                   START_TIME, time_step_range=(1, 3))
    refresh_logs = with_transition(build_refresh_abuse, N_REFRESH_ABUSE,
                                   START_TIME, time_step_range=(0, 1))
    ddos_logs    = with_transition(build_ddos,          N_DDOS,
                                   START_TIME, time_step_range=(0, 1))

    print("\nWriting individual scenario files …")
    write_jsonl(healthy_logs,  "logs_healthy.jsonl")
    write_jsonl(brute_logs,    "logs_brute_force.jsonl")
    write_jsonl(refresh_logs,  "logs_refresh_abuse.jsonl")
    write_jsonl(ddos_logs,     "logs_ddos.jsonl")

    # Sort combined by timestamp — this is the fix
    all_logs = sorted(
        healthy_logs + brute_logs + refresh_logs + ddos_logs,
        key=lambda x: x["timestamp"]
    )
    write_jsonl(all_logs, "logs_combined.jsonl")

    print(f"\n{'='*62}")
    print("  SUMMARIES")
    print(f"{'='*62}")
    summarize(healthy_logs,  "HEALTHY")
    summarize(brute_logs,    "BRUTE_FORCE")
    summarize(refresh_logs,  "REFRESH_ABUSE")
    summarize(ddos_logs,     "DDOS")
    summarize(all_logs,      "COMBINED (sorted by timestamp)")

    attack_n = len(brute_logs) + len(refresh_logs) + len(ddos_logs)
    print(f"\n  Total rows         : {len(all_logs):,}")
    print(f"  Healthy (IF pool)  : {len(healthy_logs):,}")
    print(f"  Attack (clf pool)  : {attack_n:,}  ({attack_n/len(all_logs)*100:.1f}%%)")
    print(f"\n  Done.\n")

if __name__ == "__main__":
    main()
