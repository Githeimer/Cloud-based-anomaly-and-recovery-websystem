const Model = require("../models/recordModel");

async function getAll(req, res) {
  try {
    const records = await Model.getAll(req.userId);
    res.json({ records });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch records" });
  }
}

async function create(req, res) {
  if (!req.body.diagnosis) return res.status(400).json({ message: "Diagnosis is required" });
  try {
    const record = await Model.create(req.userId, req.body);
    res.status(201).json({ record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create record" });
  }
}

async function update(req, res) {
  try {
    const record = await Model.update(req.userId, req.params.id, req.body);
    if (!record) return res.status(404).json({ message: "Diagnosis record not found" });
    res.json({ record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update record" });
  }
}

async function remove(req, res) {
  try {
    const ok = await Model.remove(req.userId, req.params.id);
    if (!ok) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete" });
  }
}

module.exports = { getAll, create, update, remove };