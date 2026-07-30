const db = require("../database");

const map = (r) => r && ({
  id: r.id,
  doctorName: r.doctor_name,
  specialty: r.specialty,
  type: r.type,
  date: r.date,
  time: r.time,
  location: r.location,
  status: r.status,
  notes: r.notes,
  createdAt: r.created_at,
});

async function getAll(userId) {
  const { rows } = await db.query(`SELECT * FROM appointments WHERE user_id = $1 ORDER BY date DESC NULLS LAST, created_at DESC`, [userId]);
  return rows.map(map);
}

async function create(userId, d) {
  const { rows } = await db.query(
    `INSERT INTO appointments (user_id, doctor_name, specialty, type, date, time, location, status, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [userId, d.doctorName, d.specialty || null, d.type || "Consultation", d.date || null, d.time || null, d.location || null, d.status || "Scheduled", d.notes || null]
  );
  return map(rows[0]);
}

async function update(userId, id, d) {
  const { rows } = await db.query(
    `UPDATE appointments SET doctor_name=$1, specialty=$2, type=$3, date=$4, time=$5, location=$6, status=$7, notes=$8
     WHERE id=$9 AND user_id=$10 RETURNING *`,
    [d.doctorName, d.specialty || null, d.type || "Consultation", d.date || null, d.time || null, d.location || null, d.status || "Scheduled", d.notes || null, id, userId]
  );
  return map(rows[0]);
}

async function remove(userId, id) {
  const { rowCount } = await db.query(`DELETE FROM appointments WHERE id = $1 AND user_id = $2`, [id, userId]);
  return rowCount > 0;
}

module.exports = { getAll, create, update, remove };