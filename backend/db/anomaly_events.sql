CREATE TABLE IF NOT EXISTS anomaly_events (
  id                SERIAL PRIMARY KEY,
  timestamp         TIMESTAMPTZ DEFAULT NOW(),
  source_ip         VARCHAR(45),
  user_agent        TEXT,
  method            VARCHAR(10),
  endpoint          VARCHAR(255),
  status_code       INTEGER,
  error_code        VARCHAR(60),
  response_time_ms  INTEGER,
  request_size_bytes  INTEGER,
  response_size_bytes INTEGER,
  user_id           VARCHAR(40),
  is_authenticated  BOOLEAN DEFAULT FALSE,
  anomaly_score     REAL,
  severity          VARCHAR(20)
);

CREATE INDEX IF NOT EXISTS idx_anomaly_timestamp ON anomaly_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_anomaly_severity ON anomaly_events(severity);

INSERT INTO anomaly_events
  (timestamp, source_ip, method, endpoint, status_code, error_code, response_time_ms, user_id, is_authenticated, anomaly_score, severity)
VALUES
  (NOW() - INTERVAL '5 minutes',   '202.51.74.10',  'POST',   '/api/auth/login',   401, 'AUTH_FAILED',          142,  NULL, FALSE, 0.94, 'High'),
  (NOW() - INTERVAL '22 minutes',  '192.168.1.42',  'GET',    '/api/records',      200, NULL,                   2231, '5',  TRUE,  0.81, 'High'),
  (NOW() - INTERVAL '39 minutes',  '202.51.74.10',  'POST',   '/api/auth/login',   401, 'AUTH_FAILED',          88,   NULL, FALSE, 0.77, 'Medium'),
  (NOW() - INTERVAL '56 minutes',  '45.118.22.9',   'POST',   '/api/prescriptions',500, 'SERVER_ERROR',         512,  '3',  TRUE,  0.69, 'Medium'),
  (NOW() - INTERVAL '73 minutes',  '103.94.12.7',   'GET',    '/api/reports',      403, 'FORBIDDEN',            63,   '8',  TRUE,  0.58, 'Medium'),
  (NOW() - INTERVAL '90 minutes',  '192.168.1.42',  'DELETE', '/api/records/91',   404, 'NOT_FOUND',            47,   '5',  TRUE,  0.41, 'Low'),
  (NOW() - INTERVAL '107 minutes', '27.34.9.155',   'GET',    '/api/appointments', 200, NULL,                   1892, '2',  TRUE,  0.36, 'Low'),
  (NOW() - INTERVAL '124 minutes', '202.51.74.10',  'POST',   '/api/auth/register',409, 'USER_ALREADY_EXISTS',  110,  NULL, FALSE, 0.33, 'Low'),
  (NOW() - INTERVAL '141 minutes', '45.118.22.9',   'GET',    '/api/records',      401, 'AUTH_UNAUTHORIZED',    54,   NULL, FALSE, 0.72, 'High'),
  (NOW() - INTERVAL '158 minutes', '103.94.12.7',   'POST',   '/api/auth/login',   401, 'AUTH_FAILED',          97,   NULL, FALSE, 0.66, 'Medium'),
  (NOW() - INTERVAL '175 minutes', '27.34.9.155',   'GET',    '/api/prescriptions',200, NULL,                   1450, '2',  TRUE,  0.31, 'Low'),
  (NOW() - INTERVAL '192 minutes', '202.51.74.10',  'POST',   '/api/auth/login',   401, 'AUTH_FAILED',          120,  NULL, FALSE, 0.88, 'High');
