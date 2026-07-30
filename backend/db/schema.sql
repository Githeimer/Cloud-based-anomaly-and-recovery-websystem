-- MediCare PostgreSQL Schema
-- Run once: psql -U youruser -d medicare -f schema.sql

CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  email       VARCHAR(160) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS records (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  diagnosis    VARCHAR(255) NOT NULL,
  description  TEXT,
  prescription VARCHAR(255),
  doctor       VARCHAR(160),
  notes        TEXT,
  sensitive    BOOLEAN DEFAULT FALSE,
  date         DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  medication    VARCHAR(255) NOT NULL,
  dosage        VARCHAR(120),
  frequency     VARCHAR(120),
  prescribed_by VARCHAR(160),
  start_date    DATE,
  end_date      DATE,
  status        VARCHAR(40) DEFAULT 'Active',
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_name  VARCHAR(160) NOT NULL,
  specialty    VARCHAR(120),
  type         VARCHAR(60) DEFAULT 'Consultation',
  date         DATE,
  time         VARCHAR(20),
  location     VARCHAR(255),
  status       VARCHAR(40) DEFAULT 'Scheduled',
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  type        VARCHAR(60) DEFAULT 'Other',
  lab_name    VARCHAR(160),
  status      VARCHAR(40) DEFAULT 'Ready',
  file_url    TEXT,
  summary     TEXT,
  date        DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_records_user ON records(user_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_user ON prescriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_user ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id);