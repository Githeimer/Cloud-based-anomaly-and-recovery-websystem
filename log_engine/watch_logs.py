'''
Fetches latest 3 logs
Currently displays them for testing and demonstration purposes (will remove this later)
Sends those logs for inference and displays the predicted labels
'''

import time
import database
import model_inference

async def fetch_latest(): # fetch the latest 3 logs from the database with asyncpg connection
    async with database.pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT
                id, timestamp, request_id, source_ip, user_agent,
                method, endpoint, status_code, error_code,
                response_time_ms, request_size_bytes, response_size_bytes,
                user_id, is_authenticated, db_query_time_ms,
                db_error, db_error_code, ingested_at
            FROM request_logs
            ORDER BY timestamp DESC
            LIMIT 3
        """)
    return [tuple(r) for r in rows]


def display(rows):  # display the latest 3 logs just fetched from the database, along with their predicted labels
    labels = model_inference.infer(rows)
    print(f"\n{'='*70}")
    print(f"  Latest 3 logs  ({time.strftime('%H:%M:%S')})")
    print(f"{'='*70}")
    for i, r in enumerate(rows):
        (id_, ts, req_id, ip, ua,
         method, endpoint, status, error_code,
         resp_ms, req_bytes, resp_bytes,
         user_id, is_auth, db_ms,
         db_error, db_error_code, ingested_at) = r
        print(f"  Log{i+1} Classification: {labels[i]}")
        print(f"  ID              : {id_}")
        print(f"  Timestamp       : {ts}")
        print(f"  Request ID      : {req_id}")
        print(f"  Source IP       : {ip}")
        print(f"  User Agent      : {ua}")
        print(f"  Method          : {method}")
        print(f"  Endpoint        : {endpoint}")
        print(f"  Status Code     : {status}")
        print(f"  Error Code      : {error_code}")
        print(f"  Response Time   : {resp_ms} ms")
        print(f"  Request Size    : {req_bytes} bytes")
        print(f"  Response Size   : {resp_bytes} bytes")
        print(f"  User ID         : {user_id}")
        print(f"  Authenticated   : {is_auth}")
        print(f"  DB Query Time   : {db_ms} ms")
        print(f"  DB Error        : {db_error}")
        print(f"  DB Error Code   : {db_error_code}")
        print(f"  Ingested At     : {ingested_at}")
        print(f"  {'-'*66}")
    print(f"{'='*70}")


async def watch_once(): # main function to call fetch and display with asyncpg connection
    try:
        rows = await fetch_latest()
        if rows:
            display(rows)
    except Exception as e:
        print(f"[WATCH] Error: {e}")


