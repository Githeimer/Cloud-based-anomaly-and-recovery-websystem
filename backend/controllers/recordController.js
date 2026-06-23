const pool = require("../database");

const createRecord = async (req, res) => {
  const { diagnosis, description, prescription, date } = req.body;
  const user_id = req.user.id;
  try {
    const result = await pool.query(
      "INSERT INTO medical_records (user_id, diagnosis, description, prescription, date) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [user_id, diagnosis, description, prescription, date],
    );
    res.status(201).json({ message: "Record created", record: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const getRecords = async (req, res) => {
  const user_id = req.user.id;
  try {
    const result = await pool.query(
      "SELECT * FROM medical_records WHERE user_id = $1 ORDER BY created_at DESC",
      [user_id],
    );
    res.json({ records: result.rows });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const updateRecord = async (req, res) => {
  const { id } = req.params;
  const { diagnosis, description, prescription, date } = req.body;
  try {
    const result = await pool.query(
      "UPDATE medical_records SET diagnosis=$1, description=$2, prescription=$3, date=$4 WHERE id=$5 AND user_id=$6 RETURNING *",
      [diagnosis, description, prescription, date, id, req.user.id],
    );
    res.json({ message: "Record updated", record: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const deleteRecord = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM medical_records WHERE id=$1 AND user_id=$2", [
      id,
      req.user.id,
    ]);
    res.json({ message: "Record deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = { createRecord, getRecords, updateRecord, deleteRecord };
