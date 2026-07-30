const Model = require("../models/prescriptionModel");

async function getAll(req, res) {
  try {
    const prescriptions = await Model.getAll(req.userId);
    res.json({ prescriptions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch prescriptions" });
  }
}

async function create(req, res) {
  if (!req.body.medication) return res.status(400).json({ message: "Medication is required" });
  try {
    const prescription = await Model.create(req.userId, req.body);
    res.status(201).json({ prescription });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create prescription" });
  }
}

async function update(req, res) {
  try {
    const prescription = await Model.update(req.userId, req.params.id, req.body);
    if (!prescription) return res.status(404).json({ message: "Medication record not found" });
    res.json({ prescription });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update prescription" });
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