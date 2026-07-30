from fastapi import FastAPI, Request
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import asyncio
import database
import buffer
import health_check
import detection_load
import classification_load
import detection
from recovery.recovery import recovery_loop

scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await database.connect_db()
    await database.init_tables()

    # Load models in order: detection first, then classifier
    detection_load.load_detection_model()
    classification_load.load_classifier_model()

    recovery_queue = asyncio.Queue()
    health_check.set_recovery_queue(recovery_queue)
    detection.set_recovery_queue(recovery_queue)

    scheduler.add_job(buffer.flush_buffer, "interval", seconds=2)
    scheduler.add_job(health_check.check_health, "interval", seconds=30)
    scheduler.add_job(detection.run_detection_cycle, "interval", seconds=10)
    scheduler.start()
    print("Scheduler started ✅")

    asyncio.create_task(recovery_loop(recovery_queue))
    print("Recovery engine started ✅")

    yield

    scheduler.shutdown()
    await buffer.flush_buffer()
    await database.disconnect_db()

app = FastAPI(lifespan=lifespan)

@app.post("/log")
async def ingest_logs(request: Request):
    try:
        logs = await request.json()
        if isinstance(logs, dict):
            logs = [logs]
        for log in logs:
            await buffer.push_to_buffer(log)
        return { "status": "ok", "received": len(logs) }
    except Exception as e:
        print(f"[INGEST] Error: {e}")
        return { "status": "error", "message": str(e) }

@app.get("/health")
async def health():
    return { "status": "ok" }