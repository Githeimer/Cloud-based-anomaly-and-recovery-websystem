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

RATE_LIMIT_DURATION_MINUTES = 10
RATE_LIMIT_PER_MIN = 10
RATE_LIMIT_BURST = 5
MAX_RETRIES = 3
RETRY_DELAYS = [0, 5, 15]

async def rate_limit_ip(source_ip: str, anomaly_event_id: int | None = None):
    if not source_ip:
        print(f"[REFRESH RECOVERY] No source_ip provided, skipping")
        return

    success = False
    output = None

    for attempt, delay in enumerate(RETRY_DELAYS):
        if delay > 0:
            print(f"[REFRESH RECOVERY] Retrying in {delay}s... (attempt {attempt + 1}/{MAX_RETRIES})")
            await asyncio.sleep(delay)

        try:
            print(f"[REFRESH RECOVERY] Rate limiting IP {source_ip} on EC2 #1")
            output = await asyncio.to_thread(_ssh_rate_limit, source_ip)
            success = True
            print(f"[REFRESH RECOVERY] ✅ IP {source_ip} rate limited to {RATE_LIMIT_PER_MIN} req/min for {RATE_LIMIT_DURATION_MINUTES} minutes")
            break

        except Exception as e:
            output = str(e)
            print(f"[REFRESH RECOVERY] ❌ Attempt {attempt + 1} failed: {e}")

    await _log_action(source_ip, success, output, anomaly_event_id)

    if success:
        asyncio.create_task(_schedule_remove_limit(source_ip, RATE_LIMIT_DURATION_MINUTES))

def _ssh_rate_limit(source_ip: str) -> str:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(
        hostname=EC2_1_HOST,
        username=EC2_1_USER,
        key_filename=EC2_1_KEY_PATH,
        timeout=10
    )
    # drop first so the ACCEPT-with-limit rule ends up above it in the chain
    commands = [
        f"sudo iptables -I INPUT -s {source_ip} -p tcp --dport 8000 -j DROP",
        f"sudo iptables -I INPUT -s {source_ip} -p tcp --dport 8000 -m limit --limit {RATE_LIMIT_PER_MIN}/min --limit-burst {RATE_LIMIT_BURST} -j ACCEPT",
    ]
    output = ""
    for cmd in commands:
        stdin, stdout, stderr = ssh.exec_command(cmd)
        output += stdout.read().decode() + stderr.read().decode()
    ssh.close()
    return output

async def _schedule_remove_limit(source_ip: str, minutes: int):
    print(f"[REFRESH RECOVERY] Rate limit removal scheduled for {source_ip} in {minutes} minutes")
    await asyncio.sleep(minutes * 60)
    try:
        output = await asyncio.to_thread(_ssh_remove_limit, source_ip)
        print(f"[REFRESH RECOVERY] ✅ Rate limit removed for {source_ip}")
    except Exception as e:
        print(f"[REFRESH RECOVERY] ❌ Remove limit failed for {source_ip}: {e}")

def _ssh_remove_limit(source_ip: str) -> str:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(
        hostname=EC2_1_HOST,
        username=EC2_1_USER,
        key_filename=EC2_1_KEY_PATH,
        timeout=10
    )
    commands = [
        f"sudo iptables -D INPUT -s {source_ip} -p tcp --dport 8000 -m limit --limit {RATE_LIMIT_PER_MIN}/min --limit-burst {RATE_LIMIT_BURST} -j ACCEPT",
        f"sudo iptables -D INPUT -s {source_ip} -p tcp --dport 8000 -j DROP",
    ]
    output = ""
    for cmd in commands:
        stdin, stdout, stderr = ssh.exec_command(cmd)
        output += stdout.read().decode() + stderr.read().decode()
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
                f"iptables rate limit {source_ip} to {RATE_LIMIT_PER_MIN}req/min for {RATE_LIMIT_DURATION_MINUTES}min",
                success,
                output
            )
        print(f"[REFRESH RECOVERY] Logged to DB ✅ (anomaly_event_id={anomaly_event_id})")
    except Exception as e:
        print(f"[REFRESH RECOVERY] Failed to log: {e}")