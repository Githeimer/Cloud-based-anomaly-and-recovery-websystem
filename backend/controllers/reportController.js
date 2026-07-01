const Model = require("../models/reportModel");

async function getAll(req, res) {
  try {
    const reports = await Model.getAll(req.userId);
    res.json({ reports });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch reports" });
  }
}

async function create(req, res) {
  if (!req.body.title) return res.status(400).json({ message: "Title is required" });
  try {
    const report = await Model.create(req.userId, req.body);
    res.status(201).json({ report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create report" });
  }
}

async function update(req, res) {
  try {
    const report = await Model.update(req.userId, req.params.id, req.body);
    if (!report) return res.status(404).json({ message: "Title record not found" });
    res.json({ report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update report" });
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