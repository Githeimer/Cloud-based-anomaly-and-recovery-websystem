import httpx
import asyncio
from datetime import datetime, timezone
import os

BACKEND_URL = os.getenv("BACKEND_SERVER_URL") # will change to EC2 #1 IP later
CHECK_INTERVAL = 30  # seconds
FAILURE_THRESHOLD = 3  # how many consecutive failures before recovery triggers

consecutive_failures = 0
recovery_queue = None  # will be set from main.py

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
                await handle_failure(f"unexpected status {response.status_code}")

    except Exception as e:
        await handle_failure(str(e))

async def handle_failure(reason: str):
    global consecutive_failures
    consecutive_failures += 1

    print(f"[HEALTH] ❌ Backend check failed ({consecutive_failures}/{FAILURE_THRESHOLD}): {reason}")

    if consecutive_failures >= FAILURE_THRESHOLD:
        print(f"[HEALTH] Threshold reached — triggering recovery")
        if recovery_queue:
            await recovery_queue.put({
                "type": "backend_down",
                "reason": reason,
                "detected_at": datetime.now(timezone.utc).isoformat(),
                "source_ip": None
            })
        consecutive_failures = 0  # reset after triggering