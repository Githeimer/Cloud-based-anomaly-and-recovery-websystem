const pool = require("../database");

const createRecordTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS medical_records (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      diagnosis VARCHAR(255) NOT NULL,
      description TEXT,
      prescription TEXT,
      is_sensitive BOOLEAN DEFAULT true,
      date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

module.exports = { createRecordTable };