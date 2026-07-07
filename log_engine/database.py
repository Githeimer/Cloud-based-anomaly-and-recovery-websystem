import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

pool = None

async def connect_db():
    global pool
    pool = await asyncpg.create_pool(
        host=os.getenv("DB_HOST"),
        port=int(os.getenv("DB_PORT")),
        database=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        min_size=2,
        max_size=10
    )
    print("Database connected ✅")

async def disconnect_db():
    global pool
    if pool:
        await pool.close()
        print("Database disconnected")

async def init_tables():
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS request_logs (
                id                  BIGSERIAL PRIMARY KEY,
                timestamp           TIMESTAMPTZ NOT NULL,
                request_id          UUID NOT NULL,
                source_ip           TEXT,
                user_agent          TEXT,
                method              VARCHAR(10),
                endpoint            TEXT,
                status_code         SMALLINT,
                error_code          VARCHAR(50),
                response_time_ms    INT,
                request_size_bytes  INT,
                response_size_bytes INT,
                user_id             VARCHAR(100),
                is_authenticated    BOOLEAN,
                db_query_time_ms    INT,
                db_error            BOOLEAN DEFAULT FALSE,
                db_error_code       VARCHAR(50),
                ingested_at         TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS anomaly_events (
                id                  BIGSERIAL PRIMARY KEY,
                detected_at         TIMESTAMPTZ DEFAULT NOW(),
                anomaly_type        VARCHAR(100),
                source_ip           TEXT,
                confidence_score    FLOAT,
                related_log_ids     BIGINT[],
                is_resolved         BOOLEAN DEFAULT FALSE
            );

            CREATE TABLE IF NOT EXISTS recovery_actions (
                id                  BIGSERIAL PRIMARY KEY,
                fired_at            TIMESTAMPTZ DEFAULT NOW(),
                anomaly_event_id    BIGINT REFERENCES anomaly_events(id),
                action_taken        VARCHAR(100),
                success             BOOLEAN,
                output              TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_logs_timestamp   ON request_logs (timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_logs_source_ip   ON request_logs (source_ip, timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_logs_user_id     ON request_logs (user_id, timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_logs_status_code ON request_logs (status_code);
            CREATE INDEX IF NOT EXISTS idx_logs_endpoint    ON request_logs (endpoint, timestamp DESC);
        """)
        print("Tables ready ✅")