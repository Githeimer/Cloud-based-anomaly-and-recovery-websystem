const { Pool } = require("pg");

const anomalyPool = new Pool({
  host: process.env.ANOMALY_DB_HOST || "localhost",
  port: process.env.ANOMALY_DB_PORT || 5432,
  user: process.env.ANOMALY_DB_USER || "postgres",
  password: process.env.ANOMALY_DB_PASSWORD || "",
  database: process.env.ANOMALY_DB_NAME || "anomaly_db",
});

anomalyPool.on("error", (err) => console.error("Anomaly DB pool error:", err));

module.exports = {
  query: (text, params) => anomalyPool.query(text, params),
  pool: anomalyPool,
};
