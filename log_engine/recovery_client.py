"""
Standalone sender: pushes raw request_logs (joined with anomaly_type) to the
recovery server.

NOT wired into main.py — the recovery-side dev owns the actual endpoint.
Fill in RECOVERY_SERVER_IP / RECOVERY_ROUTE once that's confirmed, then this
can be scheduled or imported from detection.py as needed.

Run directly to test:
    python recovery_client.py
"""

import asyncio
import os

import asyncpg
import httpx
from dotenv import load_dotenv

load_dotenv()

# ── Placeholders — replace once recovery engine confirms these ───────────────
RECOVERY_SERVER_IP = "PLACEHOLDER_IP"          # e.g. "13.201.90.208" or "13.201.90.208:8000"
RECOVERY_ROUTE      = "PLACEHOLDER_ROUTE"       # e.g. "/api/recovery/trigger"
RECOVERY_METHOD     = "GET"                     # placeholder, confirm with recovery side
RECOVERY_URL         = "https://" + RECOVERY_SERVER_IP + RECOVERY_ROUTE

FETCH_QUERY = """
    SELECT rl.id, rl.timestamp, rl.request_id, rl.source_ip, rl.user_agent,
           rl.method, rl.endpoint, rl.status_code, rl.error_code,
           rl.response_time_ms, rl.request_size_bytes, rl.response_size_bytes,
           rl.user_id, rl.is_authenticated, rl.db_query_time_ms, rl.db_error,
           rl.db_error_code, rl.ingested_at, ae.anomaly_type
    FROM request_logs rl
    LEFT JOIN anomaly_events ae
           ON rl.id = ANY(ae.related_log_ids)
    ORDER BY rl.timestamp DESC
    LIMIT $1
"""


async def fetch_logs(limit=100):
    conn = await asyncpg.connect(
        host=os.getenv("DB_HOST"),
        port=int(os.getenv("DB_PORT")),
        database=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
    )
    rows = await conn.fetch(FETCH_QUERY, limit)
    await conn.close()
    return [dict(row) for row in rows]


def _serialize(log: dict) -> dict:
    return {
        k: (v.isoformat() if hasattr(v, "isoformat") else v)
        for k, v in log.items()
    }


async def send_log(client: httpx.AsyncClient, log: dict):
    params = _serialize(log)
    try:
        response = await client.get(RECOVERY_URL, params=params, timeout=5.0)
        response.raise_for_status()
        print(f"[RECOVERY] sent log id={log['id']} -> {response.status_code}")
    except Exception as e:
        print(f"[RECOVERY] failed to send log id={log['id']}: {e}")


async def send_all_logs(limit=100):
    logs = await fetch_logs(limit)
    async with httpx.AsyncClient() as client:
        for log in logs:
            await send_log(client, log)


if __name__ == "__main__":
    asyncio.run(send_all_logs())
