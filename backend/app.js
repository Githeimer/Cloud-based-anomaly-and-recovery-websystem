const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Backend is running!" });
});

// Test database connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.log("DB Connection Failed ❌", err);
  } else {
    console.log("DB Connected! ✅", res.rows[0]);
  }
});

app.listen(PORT, () => {
  console.log(`Server Running on PORT ${PORT}`);
});