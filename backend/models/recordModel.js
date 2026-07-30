const db = require("../database");

const map = (r) => r && ({
  id: r.id,
  diagnosis: r.diagnosis,
  description: r.description,
  prescription: r.prescription,
  doctor: r.doctor,
  notes: r.notes,
  sensitive: r.sensitive,
  date: r.date,
  createdAt: r.created_at,
});

async function getAll(userId) {
  const { rows } = await db.query(
    `SELECT * FROM records WHERE user_id = $1 ORDER BY date DESC NULLS LAST, created_at DESC`,
    [userId]
  );
  return rows.map(map);
}

async function create(userId, d) {
  const { rows } = await db.query(
    `INSERT INTO records (user_id, diagnosis, description, prescription, doctor, notes, sensitive, date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [userId, d.diagnosis, d.description || null, d.prescription || null, d.doctor || null, d.notes || null, d.sensitive || false, d.date || null]
  );
  return map(rows[0]);
}

async function update(userId, id, d) {
  const { rows } = await db.query(
    `UPDATE records SET diagnosis=$1, description=$2, prescription=$3, doctor=$4, notes=$5, sensitive=$6, date=$7
     WHERE id=$8 AND user_id=$9 RETURNING *`,
    [d.diagnosis, d.description || null, d.prescription || null, d.doctor || null, d.notes || null, d.sensitive || false, d.date || null, id, userId]
  );
  return map(rows[0]);
}

async function remove(userId, id) {
  const { rowCount } = await db.query(`DELETE FROM records WHERE id = $1 AND user_id = $2`, [id, userId]);
  return rowCount > 0;
}

module.exports = { getAll, create, update, remove };