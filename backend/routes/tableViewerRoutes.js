const express = require("express");
const router = express.Router();
const { listTables, getTableRows } = require("../controllers/tableViewerController");
const { authMiddleware } = require("../middleware/authMiddleware");

router.use(authMiddleware);
router.get("/", listTables);
router.get("/:table", getTableRows);

module.exports = router;
