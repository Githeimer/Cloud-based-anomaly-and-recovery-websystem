const db = require("../database");

const map = (r) => r && ({
  id: r.id,
  medication: r.medication,
  dosage: r.dosage,
  frequency: r.frequency,
  prescribedBy: r.prescribed_by,
  startDate: r.start_date,
  endDate: r.end_date,
  status: r.status,
  notes: r.notes,
  createdAt: r.created_at,
});

async function getAll(userId) {
  const { rows } = await db.query(`SELECT * FROM prescriptions WHERE user_id = $1 ORDER BY created_at DESC`, [userId]);
  return rows.map(map);
}

async function create(userId, d) {
  const { rows } = await db.query(
    `INSERT INTO prescriptions (user_id, medication, dosage, frequency, prescribed_by, start_date, end_date, status, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [userId, d.medication, d.dosage || null, d.frequency || null, d.prescribedBy || null, d.startDate || null, d.endDate || null, d.status || "Active", d.notes || null]
  );
  return map(rows[0]);
}

async function update(userId, id, d) {
  const { rows } = await db.query(
    `UPDATE prescriptions SET medication=$1, dosage=$2, frequency=$3, prescribed_by=$4, start_date=$5, end_date=$6, status=$7, notes=$8
     WHERE id=$9 AND user_id=$10 RETURNING *`,
    [d.medication, d.dosage || null, d.frequency || null, d.prescribedBy || null, d.startDate || null, d.endDate || null, d.status || "Active", d.notes || null, id, userId]
  );
  return map(rows[0]);
}

async function remove(userId, id) {
  const { rowCount } = await db.query(`DELETE FROM prescriptions WHERE id = $1 AND user_id = $2`, [id, userId]);
  return rowCount > 0;
}

module.exports = { getAll, create, update, remove };