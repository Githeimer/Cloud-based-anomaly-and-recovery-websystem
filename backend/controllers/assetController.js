require("dotenv").config();
const pool = require("../database");

const getAssets = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM assets WHERE user_id = $1 ORDER BY created_at DESC",
      [req.user.id]
    );
    res.json({ assets: result.rows });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const createAsset = async (req, res) => {
  const { name, file_url, file_type } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO assets (user_id, name, file_url, file_type) VALUES ($1, $2, $3, $4) RETURNING *",
      [req.user.id, name, file_url, file_type]
    );
    res.status(201).json({ message: "Asset created", asset: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const deleteAsset = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      "DELETE FROM assets WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );
    res.json({ message: "Asset deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = { getAssets, createAsset, deleteAsset };