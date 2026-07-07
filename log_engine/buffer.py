import database
from datetime import datetime, timezone
from uuid import UUID

log_buffer = []
BATCH_SIZE = 100

def parse_timestamp(ts):
    if ts is None:
        return datetime.now(timezone.utc)
    if isinstance(ts, datetime):
        return ts
    return datetime.fromisoformat(ts.replace("Z", "+00:00"))

def parse_uuid(val):
    if val is None:
        return None
    if isinstance(val, UUID):
        return val
    return UUID(str(val))

def parse_int(val):
    if val is None:
        return None
    return int(val)

async def push_to_buffer(log_entry: dict):
    log_buffer.append(log_entry)

async def flush_buffer():
    if len(log_buffer) == 0:
        return

    logs_to_insert = log_buffer[:BATCH_SIZE]
    del log_buffer[:BATCH_SIZE]

    try:
        async with database.pool.acquire() as conn:
            await conn.executemany("""
                INSERT INTO request_logs (
                    timestamp, request_id, source_ip, user_agent,
                    method, endpoint, status_code, error_code,
                    response_time_ms, request_size_bytes, response_size_bytes,
                    user_id, is_authenticated, db_query_time_ms,
                    db_error, db_error_code
                ) VALUES (
                    $1, $2, $3, $4,
                    $5, $6, $7, $8,
                    $9, $10, $11,
                    $12, $13, $14,
                    $15, $16
                )
            """, [
                (
                    parse_timestamp(log.get("timestamp")),
                    parse_uuid(log.get("request_id")),
                    log.get("source_ip"),
                    log.get("user_agent"),
                    log.get("method"),
                    log.get("endpoint"),
                    parse_int(log.get("status_code")),
                    log.get("error_code"),
                    parse_int(log.get("response_time_ms")),
                    parse_int(log.get("request_size_bytes")),
                    parse_int(log.get("response_size_bytes")),
                    log.get("user_id"),
                    log.get("is_authenticated"),
                    parse_int(log.get("db_query_time_ms")),
                    log.get("db_error"),
                    log.get("db_error_code"),
                )
                for log in logs_to_insert
            ])
        print(f"[BUFFER] Flushed {len(logs_to_insert)} log(s) to DB ✅")

    except Exception as e:
        print(f"[BUFFER] Flush failed: {e}")
        log_buffer.extend(logs_to_insert)