const anomalyDb = require("../anomalyDatabase");

const ALLOWED_TABLES = ["anomaly_events", "recovery_actions"];

async function listTables(req, res) {
  try {
    const { rows } = await anomalyDb.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_type = 'BASE TABLE'
         AND table_name <> 'request_logs'
       ORDER BY table_name`
    );
    const tables = rows.map((r) => r.table_name);
    res.json({ tables });
  } catch (err) {
    console.warn("Table list unavailable:", err.message);
    res.json({ tables: ALLOWED_TABLES, source: "fallback" });
  }
}

async function getTableRows(req, res) {
  const table = req.params.table;
  const isSafe = /^[a-z_][a-z0-9_]*$/.test(table) && table !== "request_logs";
  if (!isSafe) {
    return res.status(400).json({ message: "Table not viewable" });
  }
  try {
    const check = await anomalyDb.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1`,
      [table]
    );
    if (check.rowCount === 0) {
      return res.status(404).json({ message: "Table not found" });
    }
    const { rows, fields } = await anomalyDb.query(`SELECT * FROM "${table}" LIMIT 200`);
    const columns = fields.map((f) => f.name);
    res.json({ table, columns, rows });
  } catch (err) {
    console.warn(`Failed to read table ${table}:`, err.message);
    res.status(500).json({ message: "Failed to read table", error: err.message });
  }
}

module.exports = { listTables, getTableRows };
