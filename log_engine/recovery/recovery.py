import asyncio
import os

# Infra IPs (own hosts, DB) that must never be blocked/rate-limited by mistake.
SAFE_IPS = {ip for ip in (
    os.getenv("EC2_1_HOST"),
    os.getenv("EC2_2_HOST"),
    os.getenv("EC2_3_HOST"),
    os.getenv("DB_HOST"),
) if ip}

async def handle_recovery(event: dict):
    anomaly_type = event.get("type")
    source_ip = event.get("source_ip")
    anomaly_event_id = event.get("anomaly_event_id")

    print(f"[RECOVERY] Event received: {anomaly_type} (anomaly_event_id={anomaly_event_id})")

    if source_ip and source_ip in SAFE_IPS:
        print(f"[RECOVERY] ⚠️ Skipping action against safelisted infra IP {source_ip}")
        return

    if anomaly_type == "backend_down":
        from recovery.backend_recovery import restart_backend
        await restart_backend(anomaly_event_id=anomaly_event_id)

    elif anomaly_type == "brute_force":
        from recovery.brute_recovery import block_ip
        await block_ip(source_ip=source_ip, anomaly_event_id=anomaly_event_id)

    elif anomaly_type == "refresh_abuse":
        from recovery.refresh_recovery import rate_limit_ip
        await rate_limit_ip(source_ip=source_ip, anomaly_event_id=anomaly_event_id)

    elif anomaly_type == "ddos":
        pass  # ddos_recovery.py — next

    else:
        print(f"[RECOVERY] No handler for: {anomaly_type}")

async def recovery_loop(queue: asyncio.Queue):
    print("[RECOVERY] Engine started, waiting for events...")
    while True:
        event = await queue.get()
        await handle_recovery(event)