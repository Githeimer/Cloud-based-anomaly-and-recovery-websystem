const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8000;

const { createUserTable } = require("./models/userModel");
const { createRecordTable } = require("./models/recordModel");
const { createAssetTable } = require("./models/assetModel");
const { createModelTable } = require("./models/modelModel");

const authRoutes = require("./routes/authRoutes");
const recordRoutes = require("./routes/recordRoutes");
const userRoutes = require("./routes/userRoutes");
const assetRoutes = require("./routes/assetRoutes");
const modelRoutes = require("./routes/modelRoutes");

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Backend is running!" });
});

app.use("/api/auth", authRoutes);
app.use("/api/records", recordRoutes);
app.use("/api/user", userRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/models", modelRoutes);

const initDB = async () => {
  await createUserTable();
  await createRecordTable();
  await createAssetTable();
  await createModelTable();
  console.log("Tables ready ✅");
};
initDB();

app.listen(PORT, () => {
  console.log(`Server Running on PORT ${PORT}`);
});