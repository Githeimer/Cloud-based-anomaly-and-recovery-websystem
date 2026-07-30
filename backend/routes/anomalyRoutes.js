const express = require("express");
const router = express.Router();
const { getAnomalies } = require("../controllers/anomalyController");
const { authMiddleware } = require("../middleware/authMiddleware");

router.use(authMiddleware);
router.get("/", getAnomalies);

module.exports = router;
