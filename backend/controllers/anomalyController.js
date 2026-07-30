const anomalyDb = require("../anomalyDatabase");

const ANOMALY_QUERY = `
  SELECT
    a.id,
    a.detected_at            AS timestamp,
    a.anomaly_type,
    a.confidence_score       AS anomaly_score,
    a.is_resolved,
    COALESCE(a.source_ip, r.source_ip) AS source_ip,
    r.method,
    r.endpoint,
    r.status_code,
    r.error_code,
    r.response_time_ms,
    r.user_id,
    r.is_authenticated
  FROM anomaly_events a
  LEFT JOIN LATERAL (
    SELECT *
    FROM request_logs rl
    WHERE rl.id = ANY(a.related_log_ids)
    ORDER BY rl.timestamp DESC
    LIMIT 1
  ) r ON true
  ORDER BY a.detected_at DESC
  LIMIT 200
`;

function severityFromScore(score) {
  if (score >= 0.7) return "High";
  if (score >= 0.4) return "Medium";
  return "Low";
}

async function getAnomalies(req, res) {
  try {
    const { rows } = await anomalyDb.query(ANOMALY_QUERY);
    const anomalies = rows.map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      anomaly_type: row.anomaly_type,
      source_ip: row.source_ip || "—",
      method: row.method || "",
      endpoint: row.endpoint || row.anomaly_type || "—",
      status_code: row.status_code ?? 0,
      error_code: row.error_code || null,
      response_time_ms: row.response_time_ms ?? 0,
      user_id: row.user_id || null,
      is_authenticated: !!row.is_authenticated,
      anomaly_score: row.anomaly_score ?? 0,
      severity: severityFromScore(row.anomaly_score ?? 0),
      is_resolved: !!row.is_resolved,
    }));
    res.json({ anomalies, source: "database" });
  } catch (err) {
    console.warn("Anomaly DB unavailable:", err.message);
    res.json({ anomalies: [], source: "error", message: err.message });
  }
}

module.exports = { getAnomalies };
