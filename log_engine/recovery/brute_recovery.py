import paramiko
import asyncio
import database
import os
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

load_dotenv()

EC2_1_HOST = os.getenv("EC2_1_HOST")
EC2_1_USER = os.getenv("EC2_1_USER")
EC2_1_KEY_PATH = os.getenv("EC2_1_KEY_PATH")

BLOCK_DURATION_MINUTES = 30
MAX_RETRIES = 3
RETRY_DELAYS = [0, 5, 15]

async def block_ip(source_ip: str, anomaly_event_id: int | None = None):
    if not source_ip:
        print(f"[BRUTE RECOVERY] No source_ip provided, skipping")
        return

    success = False
    output = None

    for attempt, delay in enumerate(RETRY_DELAYS):
        if delay > 0:
            print(f"[BRUTE RECOVERY] Retrying in {delay}s... (attempt {attempt + 1}/{MAX_RETRIES})")
            await asyncio.sleep(delay)

        try:
            print(f"[BRUTE RECOVERY] Blocking IP {source_ip} on EC2 #1")
            output = await asyncio.to_thread(_ssh_block, source_ip)
            success = True
            print(f"[BRUTE RECOVERY] ✅ IP {source_ip} blocked for {BLOCK_DURATION_MINUTES} minutes")
            print(f"[BRUTE RECOVERY] Output: {output}")
            break

        except Exception as e:
            output = str(e)
            print(f"[BRUTE RECOVERY] ❌ Attempt {attempt + 1} failed: {e}")

    await _log_action(source_ip, success, output, anomaly_event_id)

    if success:
        # schedule unblock after BLOCK_DURATION_MINUTES
        asyncio.create_task(_schedule_unblock(source_ip, BLOCK_DURATION_MINUTES))

def _ssh_block(source_ip: str) -> str:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(
        hostname=EC2_1_HOST,
        username=EC2_1_USER,
        key_filename=EC2_1_KEY_PATH,
        timeout=10
    )
    stdin, stdout, stderr = ssh.exec_command(
        f"sudo iptables -I INPUT -s {source_ip} -j DROP"
    )
    output = stdout.read().decode() + stderr.read().decode()
    ssh.close()
    return output

async def _schedule_unblock(source_ip: str, minutes: int):
    print(f"[BRUTE RECOVERY] Unblock scheduled for {source_ip} in {minutes} minutes")
    await asyncio.sleep(minutes * 60)
    try:
        output = await asyncio.to_thread(_ssh_unblock, source_ip)
        print(f"[BRUTE RECOVERY] ✅ IP {source_ip} unblocked")
        print(f"[BRUTE RECOVERY] Output: {output}")
    except Exception as e:
        print(f"[BRUTE RECOVERY] ❌ Unblock failed for {source_ip}: {e}")

def _ssh_unblock(source_ip: str) -> str:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(
        hostname=EC2_1_HOST,
        username=EC2_1_USER,
        key_filename=EC2_1_KEY_PATH,
        timeout=10
    )
    stdin, stdout, stderr = ssh.exec_command(
        f"sudo iptables -D INPUT -s {source_ip} -j DROP"
    )
    output = stdout.read().decode() + stderr.read().decode()
    ssh.close()
    return output

async def _log_action(source_ip: str, success: bool, output: str, anomaly_event_id: int | None):
    try:
        async with database.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO recovery_actions (fired_at, anomaly_event_id, action_taken, success, output)
                VALUES ($1, $2, $3, $4, $5)
            """,
                datetime.now(timezone.utc),
                anomaly_event_id,
                f"iptables block {source_ip} for {BLOCK_DURATION_MINUTES}min",
                success,
                output
            )
        print(f"[BRUTE RECOVERY] Logged to DB ✅ (anomaly_event_id={anomaly_event_id})")
    except Exception as e:
        print(f"[BRUTE RECOVERY] Failed to log: {e}")