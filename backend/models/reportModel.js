const db = require("../database");

const map = (r) => r && ({
  id: r.id,
  title: r.title,
  type: r.type,
  labName: r.lab_name,
  status: r.status,
  fileUrl: r.file_url,
  summary: r.summary,
  date: r.date,
  createdAt: r.created_at,
});

async function getAll(userId) {
  const { rows } = await db.query(`SELECT * FROM reports WHERE user_id = $1 ORDER BY date DESC NULLS LAST, created_at DESC`, [userId]);
  return rows.map(map);
}

async function create(userId, d) {
  const { rows } = await db.query(
    `INSERT INTO reports (user_id, title, type, lab_name, status, file_url, summary, date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [userId, d.title, d.type || "Other", d.labName || null, d.status || "Ready", d.fileUrl || null, d.summary || null, d.date || null]
  );
  return map(rows[0]);
}

async function update(userId, id, d) {
  const { rows } = await db.query(
    `UPDATE reports SET title=$1, type=$2, lab_name=$3, status=$4, file_url=$5, summary=$6, date=$7
     WHERE id=$8 AND user_id=$9 RETURNING *`,
    [d.title, d.type || "Other", d.labName || null, d.status || "Ready", d.fileUrl || null, d.summary || null, d.date || null, id, userId]
  );
  return map(rows[0]);
}

async function remove(userId, id) {
  const { rowCount } = await db.query(`DELETE FROM reports WHERE id = $1 AND user_id = $2`, [id, userId]);
  return rowCount > 0;
}

module.exports = { getAll, create, update, remove };