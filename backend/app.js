require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const recordRoutes = require("./routes/recordRoutes");
const prescriptionRoutes = require("./routes/prescriptionRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const reportRoutes = require("./routes/reportRoutes");

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/records", recordRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/reports", reportRoutes);

app.use((req, res) => res.status(404).json({ message: "Route not found" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;