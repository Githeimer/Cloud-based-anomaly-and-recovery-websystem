import httpx
import asyncio
import database
from datetime import datetime, timezone
from dotenv import load_dotenv
import os

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_SERVER_URL")
FAILURE_THRESHOLD = 3

consecutive_failures = 0
recovery_queue = None

def set_recovery_queue(queue: asyncio.Queue):
    global recovery_queue
    recovery_queue = queue

async def check_health():
    global consecutive_failures

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(BACKEND_URL)

            if response.status_code == 200:
                if consecutive_failures > 0:
                    print(f"[HEALTH] Backend recovered ✅ (was down for {consecutive_failures} check(s))")
                consecutive_failures = 0
            else:
                await handle_failure(f"GET {BACKEND_URL} returned unexpected status {response.status_code}")

    except Exception as e:
        await handle_failure(f"{type(e).__name__} while GET {BACKEND_URL}: {e}")

async def handle_failure(reason: str):
    global consecutive_failures
    consecutive_failures += 1

    print(f"[HEALTH] ❌ Backend check failed ({consecutive_failures}/{FAILURE_THRESHOLD}): {reason}")

    if consecutive_failures >= FAILURE_THRESHOLD:
        print(f"[HEALTH] Threshold reached — logging anomaly and triggering recovery")

        # write to anomaly_events, get back the ID
        anomaly_event_id = await log_anomaly_event(reason)

        if recovery_queue:
            await recovery_queue.put({
                "type": "backend_down",
                "reason": reason,
                "detected_at": datetime.now(timezone.utc).isoformat(),
                "source_ip": None,
                "anomaly_event_id": anomaly_event_id  # pass ID to recovery engine
            })

        consecutive_failures = 0

async def log_anomaly_event(reason: str) -> int | None:
    try:
        async with database.pool.acquire() as conn:
            row = await conn.fetchrow("""
                INSERT INTO anomaly_events (detected_at, anomaly_type, source_ip, confidence_score)
                VALUES ($1, $2, $3, $4)
                RETURNING id
            """,
                datetime.now(timezone.utc),
                "backend_down",
                None,
                1.0  # health check is 100% confident
            )
            anomaly_event_id = row["id"]
            print(f"[HEALTH] Anomaly logged to DB — anomaly_events id={anomaly_event_id} ✅")
            return anomaly_event_id
    except Exception as e:
        print(f"[HEALTH] Failed to log anomaly event: {e}")
        return None