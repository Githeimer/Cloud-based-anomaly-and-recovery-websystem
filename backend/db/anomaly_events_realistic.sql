TRUNCATE TABLE anomaly_events RESTART IDENTITY;

INSERT INTO anomaly_events
  (timestamp, source_ip, method, endpoint, status_code, error_code, response_time_ms, user_id, is_authenticated, anomaly_score, severity)
VALUES
  (NOW() - INTERVAL '182 minutes', '202.51.74.10', 'POST', '/api/auth/login', 401, 'AUTH_FAILED', 142, NULL, FALSE, 0.94, 'High'),
  (NOW() - INTERVAL '181 minutes', '202.51.74.10', 'POST', '/api/auth/login', 401, 'AUTH_FAILED', 88,  NULL, FALSE, 0.91, 'High'),
  (NOW() - INTERVAL '180 minutes', '202.51.74.10', 'POST', '/api/auth/login', 401, 'AUTH_FAILED', 97,  NULL, FALSE, 0.89, 'High'),
  (NOW() - INTERVAL '180 minutes', '202.51.74.10', 'POST', '/api/auth/login', 401, 'AUTH_FAILED', 110, NULL, FALSE, 0.92, 'High'),
  (NOW() - INTERVAL '179 minutes', '202.51.74.10', 'POST', '/api/auth/login', 401, 'AUTH_FAILED', 76,  NULL, FALSE, 0.88, 'High'),
  (NOW() - INTERVAL '150 minutes', '45.118.22.9',  'GET',  '/api/records',    401, 'AUTH_UNAUTHORIZED', 54, NULL, FALSE, 0.72, 'High'),
  (NOW() - INTERVAL '138 minutes', '103.94.12.7',  'POST', '/api/auth/login', 401, 'AUTH_FAILED',        97, NULL, FALSE, 0.66, 'Medium'),
  (NOW() - INTERVAL '118 minutes', '45.118.22.9',  'POST', '/api/prescriptions', 500, 'SERVER_ERROR', 512,  '3', TRUE, 0.69, 'Medium'),
  (NOW() - INTERVAL '117 minutes', '45.118.22.9',  'POST', '/api/prescriptions', 500, 'SERVER_ERROR', 631,  '3', TRUE, 0.74, 'High'),
  (NOW() - INTERVAL '116 minutes', '45.118.22.9',  'POST', '/api/records',       500, 'SERVER_ERROR', 588,  '3', TRUE, 0.71, 'High'),
  (NOW() - INTERVAL '115 minutes', '45.118.22.9',  'GET',  '/api/reports',       500, 'SERVER_ERROR', 402,  '3', TRUE, 0.63, 'Medium'),
  (NOW() - INTERVAL '74 minutes',  '192.168.1.42', 'GET',  '/api/records',      200, NULL, 2231, '5', TRUE, 0.81, 'High'),
  (NOW() - INTERVAL '73 minutes',  '27.34.9.155',  'GET',  '/api/appointments', 200, NULL, 1892, '2', TRUE, 0.58, 'Medium'),
  (NOW() - INTERVAL '42 minutes',  '103.94.12.7',  'GET',    '/api/reports',    403, 'FORBIDDEN', 63, '8', TRUE, 0.58, 'Medium'),
  (NOW() - INTERVAL '41 minutes',  '103.94.12.7',  'GET',    '/api/records/91', 403, 'FORBIDDEN', 58, '8', TRUE, 0.61, 'Medium'),
  (NOW() - INTERVAL '40 minutes',  '103.94.12.7',  'DELETE', '/api/records/91', 404, 'NOT_FOUND', 47, '8', TRUE, 0.41, 'Low'),
  (NOW() - INTERVAL '24 minutes',  '27.34.9.155',  'GET',  '/api/prescriptions', 200, NULL,                  1450, '2', TRUE, 0.31, 'Low'),
  (NOW() - INTERVAL '15 minutes',  '202.51.74.10', 'POST', '/api/auth/register', 409, 'USER_ALREADY_EXISTS', 110, NULL, FALSE, 0.33, 'Low'),
  (NOW() - INTERVAL '6 minutes',   '192.168.1.42', 'DELETE','/api/records/77',   404, 'NOT_FOUND',            51, '5', TRUE, 0.38, 'Low'),
  (NOW() - INTERVAL '2 minutes',   '45.118.22.9',  'POST', '/api/auth/login',    401, 'AUTH_FAILED',         120, NULL, FALSE, 0.55, 'Medium');
