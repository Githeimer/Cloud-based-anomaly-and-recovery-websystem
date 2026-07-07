import asyncio

async def handle_recovery(event: dict):
    anomaly_type = event.get("type")
    print(f"[RECOVERY] Event received: {anomaly_type}")

    if anomaly_type == "backend_down":
        from recovery.backend_recovery import restart_backend
        await restart_backend()

    else:
        print(f"[RECOVERY] No handler for: {anomaly_type}")

async def recovery_loop(queue: asyncio.Queue):
    print("[RECOVERY] Engine started, waiting for events...")
    while True:
        event = await queue.get()
        await handle_recovery(event)