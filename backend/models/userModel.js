const db = require("../database");

const publicUser = (row) => row && ({
  id: row.id,
  name: row.name,
  email: row.email,
  createdAt: row.created_at,
});

async function createUser({ name, email, password }) {
  const { rows } = await db.query(
    `INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *`,
    [name, email, password]
  );
  return rows[0];
}

async function findByEmail(email) {
  const { rows } = await db.query(`SELECT * FROM users WHERE email = $1`, [email]);
  return rows[0];
}

async function findById(id) {
  const { rows } = await db.query(`SELECT * FROM users WHERE id = $1`, [id]);
  return rows[0];
}

async function updatePassword(id, hashedPassword) {
  await db.query(`UPDATE users SET password = $1 WHERE id = $2`, [hashedPassword, id]);
}

module.exports = { createUser, findByEmail, findById, updatePassword, publicUser };