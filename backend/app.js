const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8000;

const { createUserTable } = require("./models/userModel");
const { createRecordTable } = require("./models/recordModel");

const authRoutes = require("./routes/authRoutes");
const recordRoutes = require("./routes/recordRoutes");
const loggerMiddleware = require("./middleware/logger");

app.use(cors());
app.use(express.json());
app.use(loggerMiddleware);

app.get("/", (req, res) => {
  res.json({ message: "Backend is running!" });
});

app.use("/api/auth", authRoutes);
app.use("/api/records", recordRoutes);

// Create tables on startup
const initDB = async () => {
  await createUserTable();
  await createRecordTable();
  console.log("Tables ready ✅");
};
initDB();

app.listen(PORT, () => {
  console.log(`Server Running on PORT ${PORT}`);
});
