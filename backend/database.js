const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "medicare",
});

pool.on("connect", () => console.log("PostgreSQL connected"));
pool.on("error", (err) => console.error("PostgreSQL pool error:", err));

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};