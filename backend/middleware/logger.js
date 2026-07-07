const { v4: uuidv4 } = require("uuid");

const logBuffer = [];
const FLUSH_INTERVAL_MS = 2000;
const LOG_ENDPOINT = process.env.LOG_ENDPOINT || "http://localhost:4000/log";

// derive a clean error_code from status + endpoint
const deriveErrorCode = (statusCode, endpoint) => {
  if (statusCode < 400) return null;
  if (statusCode === 401) return "AUTH_UNAUTHORIZED";
  if (statusCode === 400 && endpoint.includes("login")) return "AUTH_FAILED";
  if (statusCode === 400 && endpoint.includes("register"))
    return "USER_ALREADY_EXISTS";
  if (statusCode === 403) return "FORBIDDEN";
  if (statusCode === 404) return "NOT_FOUND";
  if (statusCode === 500) return "SERVER_ERROR";
  return "UNKNOWN_ERROR";
};

// flush buffer to FastAPI log server in every 2 seconds
const flushLogs = async () => {
  if (logBuffer.length === 0) return;
  const logsToSend = logBuffer.splice(0, logBuffer.length);

  try {
    await fetch(LOG_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(logsToSend),
    });
  } catch (err) {
    // python server is down — put logs back in buffer, wait for next flush
    logBuffer.unshift(...logsToSend);
  }
};
setInterval(flushLogs, FLUSH_INTERVAL_MS);

// the actual middleware
const loggerMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const requestId = uuidv4();
  const requestSizeBytes = parseInt(req.headers["content-length"] || "0", 10);

  // intercept res.json to capture response body + status
  const originalJson = res.json.bind(res);
  let responseBody = null;

  res.json = (body) => {
    responseBody = body;
    return originalJson(body);
  };

  // after response is sent
  res.on("finish", () => {
    const responseTimeMs = Date.now() - startTime;
    const statusCode = res.statusCode;

    // try to extract user_id from response body (login success)
    let userId = null;
    if (responseBody?.user?.id) {
      userId = String(responseBody.user.id);
    }

    // try to extract user_id from JWT in Authorization header (authenticated requests)
    if (!userId && req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = require("jsonwebtoken").decode(token);
        if (decoded?.id) userId = String(decoded.id);
      } catch (_) {}
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      request_id: requestId,
      source_ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
      user_agent: req.headers["user-agent"] || null,
      method: req.method,
      endpoint: req.originalUrl,
      status_code: statusCode,
      error_code: deriveErrorCode(statusCode, req.originalUrl),
      response_time_ms: responseTimeMs,
      request_size_bytes: requestSizeBytes,
      response_size_bytes: Buffer.byteLength(
        JSON.stringify(responseBody || ""),
        "utf8",
      ),
      user_id: userId,
      is_authenticated: statusCode < 400 && !!userId,
      db_query_time_ms: null, // will refine later if needed
      db_error: statusCode === 500,
      db_error_code: statusCode === 500 ? responseBody?.error || null : null,
    };

    logBuffer.push(logEntry);
  });

  next();
};

module.exports = loggerMiddleware;
