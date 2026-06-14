require("dotenv").config();
const pool = require("../database");

const getModels = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM models WHERE user_id = $1 ORDER BY created_at DESC",
      [req.user.id]
    );
    res.json({ models: result.rows });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const createModel = async (req, res) => {
  const { name, description, accuracy } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO models (user_id, name, description, accuracy) VALUES ($1, $2, $3, $4) RETURNING *",
      [req.user.id, name, description, accuracy]
    );
    res.status(201).json({ message: "Model created", model: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const updateModel = async (req, res) => {
  const { id } = req.params;
  const { name, description, status, accuracy } = req.body;
  try {
    const result = await pool.query(
      `UPDATE models SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        accuracy = COALESCE($4, accuracy)
       WHERE id = $5 AND user_id = $6 RETURNING *`,
      [name, description, status, accuracy, id, req.user.id]
    );
    res.json({ message: "Model updated", model: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const deleteModel = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      "DELETE FROM models WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );
    res.json({ message: "Model deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = { getModels, createModel, updateModel, deleteModel };