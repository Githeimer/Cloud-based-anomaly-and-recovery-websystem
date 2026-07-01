const Model = require("../models/appointmentModel");

async function getAll(req, res) {
  try {
    const appointments = await Model.getAll(req.userId);
    res.json({ appointments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch appointments" });
  }
}

async function create(req, res) {
  if (!req.body.doctorName) return res.status(400).json({ message: "Doctor name is required" });
  try {
    const appointment = await Model.create(req.userId, req.body);
    res.status(201).json({ appointment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create appointment" });
  }
}

async function update(req, res) {
  try {
    const appointment = await Model.update(req.userId, req.params.id, req.body);
    if (!appointment) return res.status(404).json({ message: "Doctor name record not found" });
    res.json({ appointment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update appointment" });
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