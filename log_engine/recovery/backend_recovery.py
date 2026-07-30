import paramiko
import asyncio
import database
import os
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

EC2_1_HOST = os.getenv("EC2_1_HOST")
EC2_1_USER = os.getenv("EC2_1_USER")
EC2_1_KEY_PATH = os.getenv("EC2_1_KEY_PATH")

MAX_RETRIES = 3
RETRY_DELAYS = [0, 5, 15]

async def restart_backend(anomaly_event_id: int | None = None):
    success = False
    output = None

    for attempt, delay in enumerate(RETRY_DELAYS):
        if delay > 0:
            print(f"[BACKEND RECOVERY] Retrying in {delay}s... (attempt {attempt + 1}/{MAX_RETRIES})")
            await asyncio.sleep(delay)

        try:
            print(f"[BACKEND RECOVERY] SSHing into EC2 #1 → pm2 restart backend")
            output = await asyncio.to_thread(_ssh_restart)
            success = True
            print(f"[BACKEND RECOVERY] ✅ Backend restarted")
            print(f"[BACKEND RECOVERY] Output: {output}")
            break

        except Exception as e:
            output = str(e)
            print(f"[BACKEND RECOVERY] ❌ Attempt {attempt + 1} failed: {e}")

    await _log_action(success, output, anomaly_event_id)

def _ssh_restart():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(
        hostname=EC2_1_HOST,
        username=EC2_1_USER,
        key_filename=EC2_1_KEY_PATH,
        timeout=10
    )
    stdin, stdout, stderr = ssh.exec_command("pm2 restart backend")
    output = stdout.read().decode() + stderr.read().decode()
    ssh.close()
    return output

async def _log_action(success: bool, output: str, anomaly_event_id: int | None):
    try:
        async with database.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO recovery_actions (fired_at, anomaly_event_id, action_taken, success, output)
                VALUES ($1, $2, $3, $4, $5)
            """,
                datetime.now(timezone.utc),
                anomaly_event_id,
                "pm2 restart backend",
                success,
                output
            )
        print(f"[BACKEND RECOVERY] Logged to DB ✅ (anomaly_event_id={anomaly_event_id})")
    except Exception as e:
        print(f"[BACKEND RECOVERY] Failed to log: {e}")